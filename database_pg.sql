-- =====================================
-- Dobby
-- Simple & Clean
-- Supabase-ready PostgreSQL
-- =====================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================
-- 1. USERS & PROFILES
-- =====================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    age INT CHECK (age >= 0),
    avatar_url TEXT,
    bio TEXT,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a public.profile and default watchlists for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1)); -- Use part of email as default username

  -- Create "Recently Searched" watchlist
  INSERT INTO public.watchlists (user_id, name)
  VALUES (NEW.id, 'Recently Searched');

  -- Create "Favourites" watchlist
  INSERT INTO public.watchlists (user_id, name)
  VALUES (NEW.id, 'Favourites');

  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================
-- 2. MOVIES & SHOWS (Minimal Cache)
-- =====================================
CREATE TABLE IF NOT EXISTS movies (
    id BIGSERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    genre TEXT[],
    poster_url TEXT,
    release_date DATE,
    rating_average NUMERIC(3,1),
    last_fetched TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shows (
    id BIGSERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    genre TEXT[],
    poster_url TEXT,
    first_air_date DATE,
    rating_average NUMERIC(3,1),
    last_fetched TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 3. RATINGS
-- =====================================
CREATE TABLE IF NOT EXISTS movie_ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id BIGINT REFERENCES movies(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

CREATE TABLE IF NOT EXISTS show_ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    show_id BIGINT REFERENCES shows(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, show_id)
);


CREATE TRIGGER trigger_update_movie_ratings_updated_at
BEFORE UPDATE ON movie_ratings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_show_ratings_updated_at
BEFORE UPDATE ON show_ratings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- 4. WATCHLISTS (Multiple per user)
-- =====================================
CREATE TABLE IF NOT EXISTS watchlists (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS watchlist_items (
    id BIGSERIAL PRIMARY KEY,
    watchlist_id BIGINT REFERENCES watchlists(id) ON DELETE CASCADE,
    movie_id BIGINT REFERENCES movies(id) ON DELETE CASCADE,
    show_id BIGINT REFERENCES shows(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(watchlist_id, movie_id, show_id),
    CHECK ((movie_id IS NOT NULL AND show_id IS NULL) OR (movie_id IS NULL AND show_id IS NOT NULL)) -- This makes sure we either added the movie or the show
);

-- =====================================
-- 5. FOLLOWS (SOCIAL GRAPH)
-- =====================================
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- =====================================
-- 6. STREAM CHAT REFERENCES
-- =====================================
CREATE TABLE IF NOT EXISTS stream_users (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    stream_user_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stream_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_channel_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stream_conversation_participants (
    conversation_id UUID REFERENCES stream_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, user_id)
);

-- =====================================
-- 7. EMBEDDINGS FOR PYTHON MICROSERVICE
-- =====================================
CREATE TABLE IF NOT EXISTS movie_embeddings (
    movie_id BIGINT primary key,
    embedding vector(64)
);

CREATE TABLE IF NOT EXISTS show_embeddings (
    show_id BIGINT primary key,
    embedding vector(64)
);

CREATE TABLE IF NOT EXISTS user_embeddings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding VECTOR(64)
);

-- =====================================
-- 8. INDEXES
-- =====================================
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_shows_title ON shows(title);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- =====================================
-- 9. ENABLE ROW LEVEL SECURITY (RLS) for Supabase
-- =====================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read all profiles
CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

