-- Add favorite_genres column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS favorite_genres integer[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN public.profiles.favorite_genres IS 'Array of TMDB genre IDs that user has selected as favorites';
