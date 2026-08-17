CREATE POLICY "Authenticated can read videos bucket"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'videos');

CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update videos files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete videos files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));