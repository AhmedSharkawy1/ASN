-- ===========================================================
-- FIX FOR MISSING COLUMNS AND CONSTRAINTS
-- Run this in Supabase SQL Editor
-- ===========================================================

-- 1. Add deposit_amount to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0;

-- 2. Update source constraint for inventory_transactions
-- We need to include 'branch_supply' as a valid source
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_source_check;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_source_check
  CHECK (source IN ('order','production','manual','production_consume','production_cancel','supply','branch_supply'));

-- 3. Ensure 'source' column exists in orders table (it usually does but just in case)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text DEFAULT 'pos';
