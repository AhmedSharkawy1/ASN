-- Add theme_colors JSONB support to the restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS theme_colors jsonb DEFAULT '{}';
