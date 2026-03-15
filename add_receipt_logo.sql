-- Add receipt_logo_url column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS receipt_logo_url TEXT;
