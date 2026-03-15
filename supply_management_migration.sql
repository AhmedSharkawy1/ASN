-- ===========================================================
-- Supply Management & Accounts Migration
-- Run this in Supabase SQL Editor
-- All statements are safe to re-run (IF NOT EXISTS)
-- ===========================================================

-- ========== 1. SUPPLIERS ==========
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant ON suppliers(restaurant_id);

-- ========== 2. SUPPLIES ==========
CREATE TABLE IF NOT EXISTS supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  total_cost numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  remaining_balance numeric DEFAULT 0,
  delivery_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplies_restaurant ON supplies(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_supplies_supplier ON supplies(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplies_delivery_date ON supplies(delivery_date DESC);

-- ========== 3. SUPPLY ITEMS ==========
CREATE TABLE IF NOT EXISTS supply_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id uuid REFERENCES supplies(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_supply_items_supply ON supply_items(supply_id);

-- ========== 4. SUPPLY PAYMENTS ==========
CREATE TABLE IF NOT EXISTS supply_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supply_id uuid REFERENCES supplies(id) ON DELETE CASCADE,
  amount numeric DEFAULT 0,
  payment_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supply_payments_supply ON supply_payments(supply_id);
CREATE INDEX IF NOT EXISTS idx_supply_payments_supplier ON supply_payments(supplier_id);

-- ========== 5. UPDATE INVENTORY TRANSACTIONS SOURCE CONSTRAINT ==========
-- Allow 'supply' as a valid source in inventory_transactions
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_source_check;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_source_check
  CHECK (source IN ('order','production','manual','production_consume','production_cancel','supply'));

-- ========== 6. RLS POLICIES ==========

-- Enable RLS on all new tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_payments ENABLE ROW LEVEL SECURITY;

-- suppliers policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'suppliers_select') THEN
    CREATE POLICY suppliers_select ON suppliers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'suppliers_insert') THEN
    CREATE POLICY suppliers_insert ON suppliers FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'suppliers_update') THEN
    CREATE POLICY suppliers_update ON suppliers FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'suppliers_delete') THEN
    CREATE POLICY suppliers_delete ON suppliers FOR DELETE USING (true);
  END IF;
END $$;

-- supplies policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supplies_select') THEN
    CREATE POLICY supplies_select ON supplies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supplies_insert') THEN
    CREATE POLICY supplies_insert ON supplies FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supplies_update') THEN
    CREATE POLICY supplies_update ON supplies FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supplies_delete') THEN
    CREATE POLICY supplies_delete ON supplies FOR DELETE USING (true);
  END IF;
END $$;

-- supply_items policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supply_items_select') THEN
    CREATE POLICY supply_items_select ON supply_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supply_items_insert') THEN
    CREATE POLICY supply_items_insert ON supply_items FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supply_items_update') THEN
    CREATE POLICY supply_items_update ON supply_items FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supply_items_delete') THEN
    CREATE POLICY supply_items_delete ON supply_items FOR DELETE USING (true);
  END IF;
END $$;

-- supply_payments policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supply_payments_select') THEN
    CREATE POLICY supply_payments_select ON supply_payments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supply_payments_insert') THEN
    CREATE POLICY supply_payments_insert ON supply_payments FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supply_payments_update') THEN
    CREATE POLICY supply_payments_update ON supply_payments FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'supply_payments_delete') THEN
    CREATE POLICY supply_payments_delete ON supply_payments FOR DELETE USING (true);
  END IF;
END $$;

-- ========== 7. REALTIME ==========
-- Uncomment and run separately if needed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
-- ALTER PUBLICATION supabase_realtime ADD TABLE supplies;
-- ALTER PUBLICATION supabase_realtime ADD TABLE supply_items;
-- ALTER PUBLICATION supabase_realtime ADD TABLE supply_payments;
