-- Users can view all follows
CREATE POLICY "Users can view all follows"
ON follows 
FOR
SELECT 
USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
ON follows 
FOR 
INSERT 
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow others
CREATE POLICY "Users can unfollow others"
ON follows 
FOR 
DELETE 
USING (auth.uid() = follower_id);

-- =====================================
-- 11. STORAGE POLICIES (Avatars)
-- =====================================

-- Allow public read access to avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects 
FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars
CREATE POLICY "Anyone can upload an avatar"
ON storage.objects 
FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects 
FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects 
FOR DELETE
USING ( bucket_id = 'avatars' AND auth.uid() = owner );
