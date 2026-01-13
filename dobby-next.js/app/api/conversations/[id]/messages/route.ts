import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
    .select('*')
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

    const isRlsError = (msg?: string | null) =>
      !!msg && /row-level security|rls|permission denied/i.test(msg);

    // 1) Try insert with the normal authed client (works if RLS allows it)
    let insertData;
    const { data: userInsertData, error: userInsertError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (!userInsertError) {
      insertData = userInsertData;
    } else if (isRlsError(userInsertError.message)) {
      // 2) Fall back to admin client (bypasses RLS), but only after verifying participant above.
      let admin;
      try {
        admin = createAdminClient();
      } catch (e) {
        console.error('Admin Supabase client not configured for message insert:', e);
        return NextResponse.json(
          {
            error:
              'Cannot send message. Insert was blocked by RLS and server is missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE / SUPABASE_SERVICE_KEY).',
            details: userInsertError.message,
          },
          { status: 500 }
        );
      }

      const { data: adminInsertData, error: adminInsertError } = await admin
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (adminInsertError) {
        console.error('Admin insert into messages failed', {
          conversationId: id,
          userId: user.id,
          error: adminInsertError,
        });
        return NextResponse.json(
          { error: adminInsertError.message || 'Failed to insert message' },
          { status: 500 }
        );
      }

      insertData = adminInsertData;
    } else {
      console.error('Insert into messages failed', {
        conversationId: id,
        userId: user.id,
        error: userInsertError,
      });

      if (userInsertError.code === 'PGRST204' && /message_type/i.test(userInsertError.message ?? '')) {
        return NextResponse.json(
          {
            error:
              "Database schema mismatch: the 'messages' table is missing the message_type column (and/or the API schema cache is stale). Add the column in Supabase or stop sending message_type.",
            details: userInsertError.message,
            hint:
              "Run the migration in supabase/migrations/20260113_add_messages_message_type_metadata.sql (or add columns message_type text and metadata jsonb in Supabase SQL editor), then reload the API schema.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: userInsertError.message }, { status: 500 });
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

    // 1) Try with the normal authed client first (works if RLS allows receiver to update)
    const { error: userClientError } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .neq('sender_id', user.id)
      .or('is_read.is.null,is_read.eq.false');

    if (!userClientError) {
      return NextResponse.json({ success: true });
    }

    // 2) Fall back to admin client (bypasses RLS)
    let admin;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error('Admin Supabase client not configured:', e);
      return NextResponse.json(
        {
          error:
            'Cannot mark messages as read. Server is missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE / SUPABASE_SERVICE_KEY) and RLS blocked the normal update.',
          details: userClientError?.message ?? null,
        },
        { status: 500 }
      );
    }

    const { error: adminError } = await admin
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .neq('sender_id', user.id)
      .or('is_read.is.null,is_read.eq.false');

    if (adminError) {
      console.error('Admin update is_read failed:', adminError);
      return NextResponse.json(
        { error: adminError.message || 'Failed to update is_read' },
        { status: 500 }
      );
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
