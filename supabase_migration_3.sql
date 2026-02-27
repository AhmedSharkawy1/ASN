-- Add payment_methods JSONB support to the restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT '[]';
