-- Add orders_enabled toggle to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS orders_enabled boolean DEFAULT true;
