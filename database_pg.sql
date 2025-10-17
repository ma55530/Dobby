-- =====================================
-- Dobby
-- Compatible with Supabase (PostgreSQL)
-- =====================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1. USERS & PROFILES
-- =========================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- 2. MOVIES & SHOWS
-- =========================
CREATE TABLE movies (
    id BIGSERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT[],
    release_date DATE,
    rating_average NUMERIC(3,1) DEFAULT 0,
    poster_url TEXT,
    trailer_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX idx_movies_title ON movies(title);

CREATE TABLE shows (
    id BIGSERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT[],
    first_air_date DATE,
    rating_average NUMERIC(3,1) DEFAULT 0,
    poster_url TEXT,
    trailer_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shows_tmdb_id ON shows(tmdb_id);
CREATE INDEX idx_shows_title ON shows(title);

-- =========================
-- 3. RATINGS & REVIEWS
-- =========================
CREATE TABLE ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id BIGINT REFERENCES movies(id) ON DELETE CASCADE,
    show_id BIGINT REFERENCES shows(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, movie_id, show_id)
);

CREATE TRIGGER trigger_update_ratings_updated_at
BEFORE UPDATE ON ratings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- 4. WATCHLIST
-- =========================
CREATE TABLE watchlist (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id BIGINT REFERENCES movies(id) ON DELETE CASCADE,
    show_id BIGINT REFERENCES shows(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, movie_id, show_id)
);

-- =========================
-- 5. FOLLOWS (SOCIAL GRAPH)
-- =========================
CREATE TABLE follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- =========================
-- 6. CHAT SYSTEM
-- =========================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_participants (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- =========================
-- 7. RECOMMENDATIONS CACHE
-- =========================
CREATE TABLE recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id BIGINT REFERENCES movies(id) ON DELETE CASCADE,
    show_id BIGINT REFERENCES shows(id) ON DELETE CASCADE,
    algorithm TEXT, -- 'content_based' or 'collaborative'
    score NUMERIC(5,3),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_user ON recommendations(user_id);

-- =========================
-- 8. SYSTEM UTILITIES / LOGS
-- =========================
CREATE TABLE activity_feed (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type TEXT CHECK (action_type IN ('rating', 'review', 'watchlist_add', 'follow')),
    target_id BIGINT,  -- movie_id, show_id, or user_id depending on action
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_feed(user_id);
CREATE INDEX idx_activity_type ON activity_feed(action_type);

-- =========================
-- 9. DEFAULT POLICIES (Supabase RLS)
-- =========================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Example RLS for profiles
CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Example RLS for messages
CREATE POLICY "Users can view messages from conversations they are part of"
ON messages FOR SELECT USING (
  sender_id = auth.uid() OR
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to conversations they are part of"
ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
  )
);

-- =========================
-- END OF DATABASE SETUP
-- =========================

