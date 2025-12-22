import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch conversations where the user is a participant
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
        sender_id
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out the current user from participants list for cleaner UI data
  // and pick the last message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedConversations = conversations.map((conv: any) => {
    const otherParticipants = conv.participants
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.user)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.id !== user.id);
      
    // Sort messages to get the last one
    const lastMessage = conv.messages && conv.messages.length > 0 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? conv.messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
      : null;

    return {
      ...conv,
      participants: otherParticipants,
      last_message: lastMessage
    };
  });

  return NextResponse.json(formattedConversations);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { recipientId } = await request.json();

  if (!recipientId) {
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

  // Check if a conversation already exists between these two users
  // This is a bit complex in SQL, so we might do a quick check or just create a new one.
  // For simplicity, let's try to find one first.
  
  // 1. Find conversations where current user is a participant
  const { data: myConvs } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id);

  if (myConvs && myConvs.length > 0) {
    const myConvIds = myConvs.map(c => c.conversation_id);
    
    // 2. Check if recipient is in any of those conversations
    const { data: existingConv } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .in('conversation_id', myConvIds)
      .eq('user_id', recipientId)
      .single();

    if (existingConv) {
      return NextResponse.json({ conversationId: existingConv.conversation_id });
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
