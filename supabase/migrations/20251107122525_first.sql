create extension if not exists "pg_net" with schema "extensions";

alter table "public"."movie_ratings" drop constraint "movie_ratings_movie_id_fkey";

alter table "public"."show_ratings" drop constraint "show_ratings_show_id_fkey";

alter table "public"."watchlist_items" drop constraint "watchlist_items_movie_id_fkey";

alter table "public"."watchlist_items" drop constraint "watchlist_items_show_id_fkey";

alter table "public"."movie_recommendations" drop constraint "movie_recommendations_user_id_fkey";

alter table "public"."show_recommendations" drop constraint "show_recommendations_user_id_fkey";

alter table "public"."user_embeddings" drop constraint "user_embeddings_user_id_fkey";

alter table "public"."movie_ratings" alter column "movie_id" set not null;

alter table "public"."show_ratings" alter column "show_id" set not null;

alter table "public"."watchlist_items" alter column "movie_id" set not null;

alter table "public"."watchlist_items" alter column "show_id" set not null;

alter table "public"."watchlists" alter column "visibility" set not null;

CREATE INDEX idx_watchlist_items_movie ON public.watchlist_items USING btree (watchlist_id, movie_id);

CREATE INDEX idx_watchlist_items_show ON public.watchlist_items USING btree (watchlist_id, show_id);

alter table "public"."movie_recommendations" add constraint "movie_recommendations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."movie_recommendations" validate constraint "movie_recommendations_user_id_fkey";

alter table "public"."show_recommendations" add constraint "show_recommendations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."show_recommendations" validate constraint "show_recommendations_user_id_fkey";

alter table "public"."user_embeddings" add constraint "user_embeddings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_embeddings" validate constraint "user_embeddings_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_movies_for_user(p_user_id uuid, p_limit integer)
 RETURNS TABLE(movie_id bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.movie_id
  FROM movie_embeddings AS m
  ORDER BY m.embedding <#> (SELECT u.embedding FROM user_embeddings AS u WHERE u.user_id = p_user_id)
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_shows_for_user(p_user_id uuid, p_limit integer)
 RETURNS TABLE(show_id bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.show_id
  FROM show_embeddings AS s
  ORDER BY s.embedding <#> (SELECT u.embedding FROM user_embeddings AS u WHERE u.user_id = p_user_id)
  LIMIT p_limit;
END;
$function$
;


  create policy "Users can manage their own movie ratings"
  on "public"."movie_ratings"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "Users can manage their own show ratings"
  on "public"."show_ratings"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



