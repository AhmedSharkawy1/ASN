-- Add fields for Theme Vicino landing page to the restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vicino_landing_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vicino_video_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vicino_logo_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vicino_about_ar TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vicino_about_en TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vicino_history_ar TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vicino_history_en TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vicino_images TEXT[];
