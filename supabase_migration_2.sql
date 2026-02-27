-- Add multiple cover images support for themes that use image sliders
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cover_images jsonb DEFAULT '[]';

-- Add working hours support
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS working_hours text;
