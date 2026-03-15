-- 1. Ensure order_id column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_requests' AND column_name='order_id') THEN
        ALTER TABLE production_requests ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Drop the restrictive unique index
DROP INDEX IF EXISTS idx_production_requests_aggregate;

-- 3. Update Unit Constraint to be more inclusive (adding 'كجم' and others)
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_unit_check;
ALTER TABLE production_requests DROP CONSTRAINT IF EXISTS production_requests_unit_check;
ALTER TABLE production_batches DROP CONSTRAINT IF EXISTS production_batches_unit_check;

ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_unit_check CHECK (unit IN ('kg','piece','liter','pack','gram','unit','كيلو','وحدة','لتر','باكيت','جرام','قطعة','كجم'));
ALTER TABLE production_requests ADD CONSTRAINT production_requests_unit_check CHECK (unit IN ('kg','piece','liter','pack','gram','unit','كيلو','وحدة','لتر','باكيت','جرام','قطعة','كجم'));
ALTER TABLE production_batches ADD CONSTRAINT production_batches_unit_check CHECK (unit IN ('kg','piece','liter','pack','gram','unit','كيلو','وحدة','لتر','باكيت','جرام','قطعة','كجم'));

-- 4. Fix any existing mismatched units
UPDATE production_requests SET unit = 'kg' WHERE unit IN ('كيلو', 'كجم');
UPDATE production_requests SET unit = 'piece' WHERE unit IN ('قطعة', 'وحدة');
