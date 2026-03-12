-- Add weight_unit column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'كجم';
