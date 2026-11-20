-- Migration: Add appearance settings columns to profiles table
-- Description: Adds display_name, cover_banner_url, social media URLs, and theme_color for store appearance customization

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS cover_banner_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS theme_color TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.display_name IS 'Display name for storefront (fallback to business_name)';
COMMENT ON COLUMN public.profiles.cover_banner_url IS 'Cover banner image URL for storefront header';
COMMENT ON COLUMN public.profiles.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN public.profiles.tiktok_url IS 'TikTok profile URL';
COMMENT ON COLUMN public.profiles.youtube_url IS 'YouTube channel URL';
COMMENT ON COLUMN public.profiles.theme_color IS 'Theme color in hex format (e.g., #00A8E8)';

-- Index for theme_color queries (optional, for future filtering)
CREATE INDEX IF NOT EXISTS idx_profiles_theme_color ON public.profiles(theme_color);