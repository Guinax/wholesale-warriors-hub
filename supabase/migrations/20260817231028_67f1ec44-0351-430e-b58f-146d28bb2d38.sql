ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'youtube';

ALTER TABLE public.videos ALTER COLUMN youtube_id SET DEFAULT '';