-- Disable group chat creation RPC (UI/API no longer calls it, this is extra safety)

DROP FUNCTION IF EXISTS public.create_new_group_conversation(text, uuid[]);
DROP FUNCTION IF EXISTS public.create_new_group_conversation(uuid[], text);

REVOKE ALL ON FUNCTION public.create_new_group_conversation(text, uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.create_new_group_conversation(text, uuid[]) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_new_group_conversation(text, uuid[]) FROM service_role;
