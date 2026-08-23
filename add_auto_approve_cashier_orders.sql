-- ===========================================================
-- Add auto_approve_cashier_orders toggle to restaurants table
-- ===========================================================

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS auto_approve_cashier_orders boolean DEFAULT false;
