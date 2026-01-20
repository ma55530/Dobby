-- To be clean, let's overload it but we will prefer the one with offset.
-- Or just Create or Replace with the new signature.

CREATE OR REPLACE FUNCTION public.get_top_movies_for_user(p_user_id uuid, p_limit integer, p_offset integer DEFAULT 0)
 RETURNS TABLE(movie_id bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.movie_id
  FROM movie_embeddings AS m
  ORDER BY m.embedding <#> (SELECT u.embedding FROM user_embeddings AS u WHERE u.user_id = p_user_id)
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_shows_for_user(p_user_id uuid, p_limit integer, p_offset integer DEFAULT 0)
 RETURNS TABLE(show_id bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.show_id
  FROM show_embeddings AS s
  ORDER BY s.embedding <#> (SELECT u.embedding FROM user_embeddings AS u WHERE u.user_id = p_user_id)
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;