-- Keep campaign media publicly readable while restricting write operations to admin-only policies.
-- This matches the frontend usage of getPublicUrl() for product/campaign images and videos.

update storage.buckets
set public = true
where id = 'media';

drop policy if exists "Authenticated can read media files" on storage.objects;
drop policy if exists "Public read media" on storage.objects;

create policy "Public read media"
on storage.objects
for select
to public
using (bucket_id = 'media');
