import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(*)
    `)
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (e) {
      console.error('POST /conversations/:id/messages invalid JSON body', {
        conversationId: id,
        userId: user.id,
        error: e,
      });
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { content, message_type, metadata } = (body ?? {}) as {
      content?: unknown;
      message_type?: unknown;
      metadata?: unknown;
    };

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Verify user is participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .single();

    if (participantError) {
      // PGRST116 means no rows found (not a participant)
      if (participantError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      console.error('Participant check failed', {
        conversationId: id,
        userId: user.id,
        error: participantError,
      });
      return NextResponse.json({ error: participantError.message }, { status: 500 });
    }

    if (!participant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Idempotency / duplicate protection: if client provides metadata.client_id,
    // avoid inserting the same message multiple times when users spam Enter.
    const clientId =
      typeof metadata === 'object' && metadata !== null
        ? (metadata as any).client_id
        : undefined;

    if (typeof clientId === 'string' && clientId.trim().length > 0) {
      const { data: existingMessage, error: existingError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .eq('sender_id', user.id)
        .contains('metadata', { client_id: clientId })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.warn('Idempotency lookup failed; continuing to insert', {
          conversationId: id,
          userId: user.id,
          clientId,
          error: existingError,
        });
      } else if (existingMessage) {
        return NextResponse.json(existingMessage);
      }
    }

    const messageData: {
      conversation_id: string;
      sender_id: string;
      content: string;
      is_read: boolean;
      message_type?: string;
      metadata?: unknown;
    } = {
      conversation_id: id,
      sender_id: user.id,
      content: content,
      is_read: false,
    };

    if (typeof message_type === 'string' && message_type.trim().length > 0) {
      messageData.message_type = message_type;
    }

    if (metadata !== undefined) {
      messageData.metadata = metadata;
    }

    const { data: insertData, error: insertError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert into messages failed', {
        conversationId: id,
        userId: user.id,
        error: insertError,
      });

      if (insertError.code === 'PGRST204' && /message_type/i.test(insertError.message ?? '')) {
        return NextResponse.json(
          {
            error:
              "Database schema mismatch: the 'messages' table is missing the message_type column (and/or the API schema cache is stale). Add the column in Supabase or stop sending message_type.",
            details: insertError.message,
            hint:
              "Run the migration in supabase/migrations/20260113_add_messages_message_type_metadata.sql (or add columns message_type text and metadata jsonb in Supabase SQL editor), then reload the API schema.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Create notifications for all participants except the sender
    const { data: allParticipants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', id);

    if (!participantsError && allParticipants) {
      // Get conversation details to check if it's a group
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('is_group, group_name')
        .eq('id', id)
        .single();

      console.log('Conversation data:', conversation, 'Error:', convError);

      // Get sender's profile for username
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      console.log('Sender profile:', senderProfile);

      // Filter out the sender and create notifications for everyone else
      const recipientIds = allParticipants
        .map(p => p.user_id)
        .filter(userId => userId !== user.id);

      if (recipientIds.length > 0) {
        let notificationContent = content.substring(0, 50);
        
        // For group messages, prepend group name and sender
        if (conversation?.is_group && conversation?.group_name) {
          const senderName = senderProfile?.username || 'Someone';
          notificationContent = `${conversation.group_name}: ${senderName} - ${content.substring(0, 30)}`;
          console.log('Group notification content:', notificationContent);
        } else {
          console.log('Not a group or no group name, using regular content');
        }

        const notifications = recipientIds.map(recipientId => ({
          user_id: recipientId,
          actor_id: user.id,
          type: 'message',
          resource_id: id, // conversation_id
          content: notificationContent,
        }));

        console.log('Creating notifications:', notifications);

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Failed to create notifications', {
            conversationId: id,
            userId: user.id,
            recipientIds,
            error: notifError,
          });
          // Non-fatal - message was sent successfully
        }
      }
    }

    // Update conversation updated_at (non-fatal if this fails)
    const { error: updateConvError } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateConvError) {
      console.warn('Failed to update conversations.updated_at after message insert', {
        conversationId: id,
        userId: user.id,
        error: updateConvError,
      });
    }

    return NextResponse.json(insertData);
  } catch (e) {
    console.error('Unexpected error in POST /conversations/:id/messages', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is participant (security check)
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .neq('sender_id', user.id)
      .or('is_read.is.null,is_read.eq.false');

    if (updateError) {
      console.error('Update is_read failed:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update is_read' },
        { status: 500 }
      );
    }

    // Also mark message notifications from this conversation as read.
    // The notifications trigger sets actor_id = sender_id, so clearing by actor_id
    // is a reliable way to clear "new message" notifications for the user.
    const { data: others, error: othersError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', id)
      .neq('user_id', user.id);

    if (othersError) {
      console.warn('Failed to fetch other participants for notification clearing', {
        conversationId: id,
        userId: user.id,
        error: othersError,
      });
    } else {
      const otherIds = (others ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) => row.user_id)
        .filter((x: unknown): x is string => typeof x === 'string' && x.length > 0);

      if (otherIds.length > 0) {
        const { error: notifError } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('type', 'message')
          .in('actor_id', otherIds)
          .or('is_read.is.null,is_read.eq.false');

        if (notifError) {
          console.warn('Failed to mark message notifications as read', {
            conversationId: id,
            userId: user.id,
            otherIds,
            error: notifError,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Unexpected error marking messages as read:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
