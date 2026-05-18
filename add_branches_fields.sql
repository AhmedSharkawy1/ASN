-- Add branch configuration fields to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS branches_enabled BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS branches JSONB DEFAULT '[]'::jsonb;

-- Add branch_name field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_name TEXT;
