-- Migration: Add pickup_enabled and delivery_enabled columns to restaurants table
-- By default both are true (both options visible to customers)

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS pickup_enabled boolean DEFAULT true;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_enabled boolean DEFAULT true;
