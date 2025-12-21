drop policy "Anyone can read follows" on "public"."follows";

drop policy "Users can unfollow" on "public"."follows";

drop function if exists "public"."create_new_conversation"(recipient_id uuid);

alter table "public"."watchlist_items" alter column "movie_id" set not null;

alter table "public"."watchlist_items" alter column "show_id" set not null;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, resource_id, content)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', NEW.follower_id, 'started following you');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(c_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = c_id 
    AND user_id = auth.uid()
  );
END;
$function$
;


  create policy "Users can unfollow others"
  on "public"."follows"
  as permissive
  for delete
  to public
using ((auth.uid() = follower_id));



  create policy "Users can view all follows"
  on "public"."follows"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Anyone can upload an avatar"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Avatar images are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Users can delete their own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'avatars'::text) AND (auth.uid() = owner)));



  create policy "Users can update their own avatar"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND (auth.uid() = owner)))
with check (((bucket_id = 'avatars'::text) AND (auth.uid() = owner)));



