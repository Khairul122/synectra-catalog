-- Any number of social profile links (icon detected from the URL), replacing the fixed Instagram/TikTok/YouTube fields.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(social_links) = 'array');

-- Carry over existing values; the old columns stay (unused) so this is safe to roll back.
UPDATE public.profiles
SET social_links = to_jsonb(array_remove(ARRAY[instagram_url, tiktok_url, youtube_url], NULL))
WHERE social_links = '[]'::jsonb
  AND (instagram_url IS NOT NULL OR tiktok_url IS NOT NULL OR youtube_url IS NOT NULL);
