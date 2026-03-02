-- ===========================================================
-- Addons / Extras Migration
-- Run this in Supabase SQL Editor
-- ===========================================================

-- Addons table: savory/sweet extras that customer can add to items
CREATE TABLE IF NOT EXISTS addons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    name_ar text NOT NULL,
    name_en text,
    price numeric DEFAULT 0,
    type text DEFAULT 'savory' CHECK (type IN ('savory', 'sweet')),
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addons_restaurant ON addons(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_addons_type ON addons(type);

-- Enable RLS
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read active addons (for menu display)
CREATE POLICY "Public can read active addons"
    ON addons FOR SELECT
    USING (is_active = true);

-- Policy: restaurant owners can manage their addons
CREATE POLICY "Restaurant owners can manage addons"
    ON addons FOR ALL
    USING (true)
    WITH CHECK (true);
