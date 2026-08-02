-- Add high_quality_images column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS high_quality_images BOOLEAN DEFAULT false;
