-- Fix recursive RLS policies on conversation_participants

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;

-- 2. Create a simpler non-recursive policy for viewing own rows
CREATE POLICY "Users can view their own participant rows"
ON public.conversation_participants FOR SELECT
USING (user_id = auth.uid());

-- 3. Create a policy for viewing other participants in the same conversations
-- This depends on the first policy allowing us to find our own conversation_ids
CREATE POLICY "Users can view other participants in their conversations"
ON public.conversation_participants FOR SELECT
USING (
    conversation_id IN (
        SELECT conversation_id 
        FROM public.conversation_participants 
        WHERE user_id = auth.uid()
    )
);

-- 4. Re-create insert policy (simplified)
CREATE POLICY "Users can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (
    -- Allow users to add themselves
    user_id = auth.uid()
    OR
    -- OR allow adding others if I am already in the conversation
    conversation_id IN (
        SELECT conversation_id 
        FROM public.conversation_participants 
        WHERE user_id = auth.uid()
    )
);
