-- ===========================================================
-- Order Management System Migration
-- Run this in Supabase SQL Editor
-- ===========================================================

-- Extend orders table with delivery/pickup fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'pickup' CHECK (order_type IN ('delivery', 'pickup'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone_id uuid REFERENCES delivery_zones(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone_name text;

-- Index for fast filtering by order type
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
