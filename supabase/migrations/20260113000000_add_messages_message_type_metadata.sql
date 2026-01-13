-- Adds optional message typing + metadata for messaging/recommendations.
-- Needed for sending movie/show recommendations via messages.

alter table if exists public.messages
  add column if not exists message_type text,
  add column if not exists metadata jsonb;
