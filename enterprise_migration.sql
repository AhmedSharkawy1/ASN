-- ===========================================================
-- Enterprise Dashboard Migration
-- Run this in Supabase SQL Editor
-- ===========================================================

-- ========== ITEMS: extend ==========
ALTER TABLE items ADD COLUMN IF NOT EXISTS stock_quantity int DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS discount_price numeric;
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ========== ORDERS ==========
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  order_number serial,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','preparing','ready','out_for_delivery','completed','cancelled')),
  items jsonb DEFAULT '[]',
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  discount_type text DEFAULT 'fixed',
  total numeric DEFAULT 0,
  payment_method text DEFAULT 'cash',
  table_id uuid,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  notes text,
  is_draft boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- ========== ORDER ACTIVITY LOG ==========
CREATE TABLE IF NOT EXISTS order_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_status text,
  new_status text,
  performed_by text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_logs_order ON order_logs(order_id);

-- ========== TABLES ==========
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  label text NOT NULL,
  capacity int DEFAULT 4,
  status text DEFAULT 'available' CHECK (status IN ('available','occupied','reserved','merged')),
  merged_with uuid,
  current_order_id uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id);

-- ========== DELIVERY ZONES ==========
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  fee numeric DEFAULT 0,
  min_order numeric DEFAULT 0,
  estimated_time int DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_restaurant ON delivery_zones(restaurant_id);

-- ========== CUSTOMERS ==========
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  loyalty_points int DEFAULT 0,
  total_spent numeric DEFAULT 0,
  total_orders int DEFAULT 0,
  last_order_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ========== TEAM MEMBERS ==========
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role text DEFAULT 'staff' CHECK (role IN ('admin','manager','kitchen','cashier','delivery','staff')),
  permissions jsonb DEFAULT '{"orders":true,"products":false,"settings":false,"team":false,"customers":false}',
  is_active boolean DEFAULT true,
  last_active timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_restaurant ON team_members(restaurant_id);

-- ========== NOTIFICATIONS ==========
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text DEFAULT 'info' CHECK (type IN ('info','success','warning','error','order')),
  target text DEFAULT 'broadcast',
  target_role text,
  is_read boolean DEFAULT false,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant ON notifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ========== RESTAURANTS: extend for subscriptions ==========
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EGP';

-- ========== Enable Realtime on orders for KDS ==========
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- (Run this separately if needed)
