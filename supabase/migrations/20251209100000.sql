-- Drop existing tables (safe since empty)
DROP TABLE IF EXISTS movie_ratings CASCADE;
DROP TABLE IF EXISTS show_ratings CASCADE;

-- Recreate with UUID
CREATE TABLE IF NOT EXISTS movie_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id BIGINT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

CREATE TABLE IF NOT EXISTS show_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    show_id BIGINT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, show_id)
);

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','message','like','reply','review_movie','review_show'));

  -- Trigger function to create notifications when a review is posted
CREATE OR REPLACE FUNCTION notify_followers_on_review()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, resource_id, content)
  SELECT 
    f.follower_id,
    NEW.user_id,
    CASE 
      WHEN TG_TABLE_NAME = 'movie_ratings' THEN 'review_movie'
      WHEN TG_TABLE_NAME = 'show_ratings' THEN 'review_show'
    END,
    NEW.id,
    CASE 
      WHEN TG_TABLE_NAME = 'movie_ratings' THEN 'reviewed a movie with rating ' || NEW.rating || '/10'
      WHEN TG_TABLE_NAME = 'show_ratings' THEN 'reviewed a show with rating ' || NEW.rating || '/10'
    END
  FROM follows f
  WHERE f.following_id = NEW.user_id AND NEW.review IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on movie_ratings
CREATE TRIGGER trigger_notify_followers_movie_review
AFTER INSERT OR UPDATE ON movie_ratings
FOR EACH ROW
EXECUTE FUNCTION notify_followers_on_review();

-- Trigger on show_ratings
CREATE TRIGGER trigger_notify_followers_show_review
AFTER INSERT OR UPDATE ON show_ratings
FOR EACH ROW
EXECUTE FUNCTION notify_followers_on_review();

-- Allow system to insert notifications
CREATE POLICY "Allow system to insert notifications"
ON notifications
FOR INSERT
WITH CHECK (true);