-- Add social media links and default theme mode columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS snapchat_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_group_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS default_theme_mode TEXT DEFAULT 'system';
