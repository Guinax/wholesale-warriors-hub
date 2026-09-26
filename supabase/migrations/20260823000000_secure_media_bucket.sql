-- Remove the public read policy from the media bucket
DROP POLICY IF EXISTS "Public can read media files" ON storage.objects;

-- Allow authenticated users to read media files (Admins and logged-in users)
CREATE POLICY "Authenticated can read media files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media');
