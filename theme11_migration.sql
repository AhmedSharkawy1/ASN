ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS marquee_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS marquee_text_ar TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS marquee_text_en TEXT;
