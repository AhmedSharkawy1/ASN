-- Add address column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address TEXT;
