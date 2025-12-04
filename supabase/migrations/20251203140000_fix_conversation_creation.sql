-- Function to create a conversation and add participants atomically
CREATE OR REPLACE FUNCTION public.create_new_conversation(recipient_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the conversation
  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO new_id;

  -- Add the creator (current user)
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (new_id, current_user_id);

  -- Add the recipient ONLY IF it's a different user (to avoid PK violation)
  IF recipient_id <> current_user_id THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (new_id, recipient_id);
  END IF;

  RETURN new_id;
END;
$$;
