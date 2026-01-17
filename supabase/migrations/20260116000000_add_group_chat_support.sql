-- Add group chat support to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_name TEXT,
ADD COLUMN IF NOT EXISTS group_avatar_url TEXT;

-- Create index for faster group lookups
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON conversations(is_group);
