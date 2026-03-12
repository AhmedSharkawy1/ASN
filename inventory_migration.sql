-- ===========================================================
-- Inventory, Factory & Cost Engine Migration
-- Run this in Supabase SQL Editor
-- All statements are safe to re-run (IF NOT EXISTS)
-- ===========================================================

-- ========== 1. INVENTORY ITEMS ==========
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'kg' CHECK (unit IN ('kg','piece','liter','pack','gram','unit')),
  minimum_stock numeric DEFAULT 0,
  item_type text DEFAULT 'raw_material' CHECK (item_type IN ('raw_material','product')),
  -- Cost engine fields
  cost_per_unit numeric DEFAULT 0,
  currency text DEFAULT 'EGP',
  supplier text,
  -- Expiry tracking
  expiry_tracking boolean DEFAULT false,
  expiry_date date,
  -- Organization
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_restaurant ON inventory_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_type ON inventory_items(item_type);

-- ========== 2. RECIPES ==========
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  product_cost numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON recipes(restaurant_id);

-- ========== 3. RECIPE INGREDIENTS ==========
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'kg'
);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- ========== 4. PRODUCTION REQUESTS (Aggregated Factory Queue) ==========
CREATE TABLE IF NOT EXISTS production_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'kg',
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  production_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_requests_restaurant ON production_requests(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_production_requests_status ON production_requests(status);
-- Unique index for aggregation: one row per product per day per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_production_requests_aggregate
  ON production_requests(restaurant_id, recipe_id, production_date)
  WHERE status = 'pending';

-- ========== 5. PRODUCTION BATCHES ==========
CREATE TABLE IF NOT EXISTS production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'kg',
  produced_by text,
  produced_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_batches_restaurant ON production_batches(restaurant_id);

-- ========== 6. INVENTORY TRANSACTIONS ==========
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL,
  action text NOT NULL CHECK (action IN ('add','deduct')),
  source text NOT NULL CHECK (source IN ('order','production','manual','production_consume')),
  reference_id text,
  performed_by text DEFAULT 'system',
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_restaurant ON inventory_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON inventory_transactions(created_at DESC);

-- ========== 7. EXTEND EXISTING TABLES ==========

-- items: ID-based linking to inventory and recipes
ALTER TABLE items ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL;

-- orders: cost engine fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_cost numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_profit numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS profit_margin numeric;

-- ========== 8. RLS POLICIES ==========

-- Enable RLS on all new tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- inventory_items policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'inventory_items_select') THEN
    CREATE POLICY inventory_items_select ON inventory_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'inventory_items_insert') THEN
    CREATE POLICY inventory_items_insert ON inventory_items FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'inventory_items_update') THEN
    CREATE POLICY inventory_items_update ON inventory_items FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'inventory_items_delete') THEN
    CREATE POLICY inventory_items_delete ON inventory_items FOR DELETE USING (true);
  END IF;
END $$;

-- recipes policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recipes_select') THEN
    CREATE POLICY recipes_select ON recipes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recipes_insert') THEN
    CREATE POLICY recipes_insert ON recipes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recipes_update') THEN
    CREATE POLICY recipes_update ON recipes FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recipes_delete') THEN
    CREATE POLICY recipes_delete ON recipes FOR DELETE USING (true);
  END IF;
END $$;

-- recipe_ingredients policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recipe_ingredients_select') THEN
    CREATE POLICY recipe_ingredients_select ON recipe_ingredients FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recipe_ingredients_insert') THEN
    CREATE POLICY recipe_ingredients_insert ON recipe_ingredients FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recipe_ingredients_update') THEN
    CREATE POLICY recipe_ingredients_update ON recipe_ingredients FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recipe_ingredients_delete') THEN
    CREATE POLICY recipe_ingredients_delete ON recipe_ingredients FOR DELETE USING (true);
  END IF;
END $$;

-- production_requests policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'production_requests_select') THEN
    CREATE POLICY production_requests_select ON production_requests FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'production_requests_insert') THEN
    CREATE POLICY production_requests_insert ON production_requests FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'production_requests_update') THEN
    CREATE POLICY production_requests_update ON production_requests FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'production_requests_delete') THEN
    CREATE POLICY production_requests_delete ON production_requests FOR DELETE USING (true);
  END IF;
END $$;

-- production_batches policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'production_batches_select') THEN
    CREATE POLICY production_batches_select ON production_batches FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'production_batches_insert') THEN
    CREATE POLICY production_batches_insert ON production_batches FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'production_batches_update') THEN
    CREATE POLICY production_batches_update ON production_batches FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'production_batches_delete') THEN
    CREATE POLICY production_batches_delete ON production_batches FOR DELETE USING (true);
  END IF;
END $$;

-- inventory_transactions policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'inventory_transactions_select') THEN
    CREATE POLICY inventory_transactions_select ON inventory_transactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'inventory_transactions_insert') THEN
    CREATE POLICY inventory_transactions_insert ON inventory_transactions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ========== 9. REALTIME ==========
-- Uncomment and run separately if needed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
-- ALTER PUBLICATION supabase_realtime ADD TABLE production_requests;
-- ALTER PUBLICATION supabase_realtime ADD TABLE inventory_transactions;
