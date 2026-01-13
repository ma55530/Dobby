-- Adds optional message typing + metadata for messaging/recommendations.
-- Apply via Supabase Dashboard (SQL Editor) or via Supabase CLI migrations.

alter table if exists public.messages
  add column if not exists message_type text,
  add column if not exists metadata jsonb;

-- If you want a default value for is_read, uncomment:
-- alter table if exists public.messages
--   alter column is_read set default false;
