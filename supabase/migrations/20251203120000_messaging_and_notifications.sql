-- =====================================
-- MESSAGING & NOTIFICATIONS
-- =====================================

-- 1. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONVERSATION PARTICIPANTS
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- 4. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- The recipient
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- The person who triggered the notification
    type TEXT NOT NULL CHECK (type IN ('follow', 'message', 'like', 'reply')),
    resource_id UUID, -- Can be a message_id, or follower_id, etc.
    content TEXT, -- Optional preview text
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- TRIGGERS & FUNCTIONS
-- =====================================

-- Update updated_at on conversations
CREATE TRIGGER trigger_update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a notification when someone follows a user
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, resource_id, content)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', NEW.follower_id, 'started following you');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new follows
CREATE TRIGGER on_new_follow
AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION public.handle_new_follow();

-- Function to create a notification when a new message is received
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all participants in the conversation EXCEPT the sender
  INSERT INTO public.notifications (user_id, actor_id, type, resource_id, content)
  SELECT 
    cp.user_id, 
    NEW.sender_id, 
    'message', 
    NEW.id, 
    left(NEW.content, 50) -- Preview first 50 chars
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id <> NEW.sender_id;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new messages
CREATE TRIGGER on_new_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- =====================================
-- RLS POLICIES
-- =====================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- CONVERSATIONS
-- Users can view conversations they are part of
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
    )
);

-- Users can create conversations (implicitly via participants)
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (true);

-- CONVERSATION PARTICIPANTS
-- Users can view participants of conversations they are in
CREATE POLICY "Users can view participants of their conversations"
ON conversation_participants FOR SELECT
USING (
    conversation_id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = auth.uid()
    )
);

-- Users can add themselves or others to a conversation (simplified for now)
CREATE POLICY "Users can add participants"
ON conversation_participants FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    conversation_id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = auth.uid()
    )
);

-- MESSAGES
-- Users can view messages in conversations they belong to
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
    conversation_id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = auth.uid()
    )
);

-- Users can insert messages into conversations they belong to
CREATE POLICY "Users can send messages to their conversations"
ON messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = auth.uid()
    )
);

-- NOTIFICATIONS
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================
-- REALTIME
-- =====================================

-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
