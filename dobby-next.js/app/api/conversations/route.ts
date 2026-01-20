import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Conversation } from '@/lib/types/Conversation';
import { UserProfile } from '@/lib/types/UserProfile';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Get conversation IDs for the current user
  const { data: userConvs, error: userConvsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id);

  if (userConvsError) {
    return NextResponse.json({ error: userConvsError.message }, { status: 500 });
  }

  const conversationIds = userConvs.map(c => c.conversation_id);

  if (conversationIds.length === 0) {
    return NextResponse.json([]);
  }

  // 2. Fetch those conversations
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants(
        user:profiles(*)
      ),
      messages(
        content,
        created_at,
        is_read,
        sender_id,
        message_type
      )
    `)
    .in('id', conversationIds)
    .order('created_at', { ascending: false, referencedTable: 'messages' })
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch last message for each conversation separately
  const conversationsWithMessages = await Promise.all(
    conversations.map(async (conv: Conversation) => {
      // Get the last message for this conversation
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, created_at, is_read, sender_id, message_type')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(100); // Get recent messages for unread count

      const lastMessage = messages && messages.length > 0 ? messages[0] : null;
      
      return {
        ...conv,
        messages,
        last_message: lastMessage,
      };
    })
  );

  // Filter out the current user from participants list for cleaner UI data
  const formattedConversations = conversationsWithMessages.map((conv) => {
    const otherParticipants = conv.participants
      ?.map((p: UserProfile) => p)
      ?.filter((p: UserProfile) => p.id !== user.id) || [];
      
    // Sort messages to get the last one
    const messages = conv.messages || [];
    const lastMessage = messages.length > 0 
      ? messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
      : null;

    // Format last message content
    if (lastMessage) {
      const msgType = (lastMessage as { message_type?: string }).message_type;
      if (msgType === 'review' && !lastMessage.content) {
        lastMessage.content = 'Shared a review';
      } else if (msgType === 'movie' && !lastMessage.content) {
        lastMessage.content = 'Shared a movie';
      } else if (msgType === 'show' && !lastMessage.content) {
        lastMessage.content = 'Shared a show';
      }
    }

    // Count unread messages (messages sent by others that aren't read)
    // Treat NULL as unread (older rows might have is_read = NULL)
    const unreadCount = messages
      ? messages.filter((m) => m.is_read !== true && m.sender_id !== user.id).length
      : 0;

    return {
      ...conv,
      participants: otherParticipants,
      unread_count: unreadCount,
    };
  });

  // Sort by last message time (most recent first)
  formattedConversations.sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at;
    const bTime = b.last_message?.created_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return NextResponse.json(formattedConversations);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { recipientId, recipientIds, groupName, groupAvatarUrl } = (body ?? {}) as {
    recipientId?: unknown;
    recipientIds?: unknown;
    groupName?: unknown;
    groupAvatarUrl?: unknown;
  };

  // Handle group chat creation
  if (Array.isArray(recipientIds) && recipientIds.length > 0) {
    if (!groupName || typeof groupName !== 'string') {
      return NextResponse.json({ error: 'Group name is required for group chats' }, { status: 400 });
    }

    // Validate all recipient IDs are strings and not the current user
    const validRecipientIds = recipientIds.filter(
      (id): id is string => typeof id === 'string' && id !== user.id
    );

    if (validRecipientIds.length === 0) {
      return NextResponse.json({ error: 'At least one other user is required for a group' }, { status: 400 });
    }

    // Check if all recipients exist
    const { data: recipientProfiles, error: recipientsError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', validRecipientIds);

    if (recipientsError) {
      return NextResponse.json({ error: recipientsError.message }, { status: 400 });
    }

    if (!recipientProfiles || recipientProfiles.length !== validRecipientIds.length) {
      return NextResponse.json({ error: 'One or more recipients not found' }, { status: 404 });
    }

    // Create group conversation
    const conversationData: Record<string, unknown> = {
      is_group: true,
      group_name: groupName,
    };

    if (groupAvatarUrl && typeof groupAvatarUrl === 'string') {
      conversationData.group_avatar_url = groupAvatarUrl;
    }

    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select('id')
      .single();

    if (convError) {
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    // Add all participants (including creator)
    const participantsToAdd = [user.id, ...validRecipientIds].map(userId => ({
      conversation_id: newConv.id,
      user_id: userId,
    }));

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participantsToAdd);

    if (participantsError) {
      // Rollback: delete the conversation
      await supabase.from('conversations').delete().eq('id', newConv.id);
      return NextResponse.json({ error: participantsError.message }, { status: 500 });
    }

    return NextResponse.json({ conversationId: newConv.id });
  }

  // 1:1 conversation (backward-compatible)
  if (!recipientId || typeof recipientId !== 'string') {
    return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
  }

  if (recipientId === user.id) {
    return NextResponse.json({ error: 'Cannot start a conversation with yourself' }, { status: 400 });
  }

  const { data: recipientProfile, error: recipientError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', recipientId)
    .maybeSingle();

  if (recipientError) {
    return NextResponse.json({ error: recipientError.message }, { status: 400 });
  }

  if (!recipientProfile) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }

  // Check if a 1:1 conversation already exists between these two users
  // We need to find conversations where:
  // 1. Both users are participants
  // 2. It's NOT a group chat (is_group = false or null)
  // 3. There are exactly 2 participants
  
  // 1. Find non-group conversations where current user is a participant
  const { data: myConvs } = await supabase
    .from('conversation_participants')
    .select('conversation_id, conversations!inner(is_group)')
    .eq('user_id', user.id)
    .or('is_group.is.null,is_group.eq.false', { foreignTable: 'conversations' });

  if (myConvs && myConvs.length > 0) {
    const myConvIds = myConvs.map(c => c.conversation_id);
    
    // 2. Check if recipient is in any of those 1:1 conversations
    for (const convId of myConvIds) {
      // Count participants in this conversation
      const { data: participants, error: countError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId);

      if (countError) continue;

      // Check if it's a 1:1 conversation (exactly 2 participants)
      // and if the recipient is one of them
      if (participants && participants.length === 2) {
        const hasRecipient = participants.some(p => p.user_id === recipientId);
        if (hasRecipient) {
          return NextResponse.json({ conversationId: convId });
        }
      }
    }
  }

  // Create new conversation using RPC to avoid RLS issues with atomic insertion
  const { data: newConvId, error: createError } = await supabase
    .rpc('create_new_conversation', { recipient_id: recipientId });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ conversationId: newConvId });
}
