-- Step 1: Drop all unit constraints across all tables to start clean
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_unit_check;
ALTER TABLE production_requests DROP CONSTRAINT IF EXISTS production_requests_unit_check;
ALTER TABLE production_batches DROP CONSTRAINT IF EXISTS production_batches_unit_check;
ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_unit_check;

-- Step 2: Harmonize the data - Convert all existing variations to English keys
-- This ensures the database is clean and standard
UPDATE inventory_items 
SET unit = CASE 
  WHEN unit IN ('كيلو', 'Kilogram', 'KG', 'kg') THEN 'kg'
  WHEN unit IN ('قطعة', 'وحدة', 'unit', 'Piece', 'pc', 'piece') THEN 'piece'
  WHEN unit IN ('لتر', 'Liter', 'L', 'liter') THEN 'liter'
  WHEN unit IN ('باكيت', 'Pack', 'pkg', 'pack') THEN 'pack'
  WHEN unit IN ('جرام', 'Gram', 'g', 'gram') THEN 'gram'
  ELSE 'unit' -- Default for anything else
END;

UPDATE production_requests 
SET unit = CASE 
  WHEN unit IN ('كيلو', 'Kilogram', 'KG', 'kg') THEN 'kg'
  WHEN unit IN ('قطعة', 'وحدة', 'unit', 'Piece', 'pc', 'piece') THEN 'piece'
  WHEN unit IN ('لتر', 'Liter', 'L', 'liter') THEN 'liter'
  ELSE 'unit'
END;

UPDATE production_batches 
SET unit = CASE 
  WHEN unit IN ('كيلو', 'Kilogram', 'KG', 'kg') THEN 'kg'
  WHEN unit IN ('قطعة', 'وحدة', 'unit', 'Piece', 'pc', 'piece') THEN 'piece'
  WHEN unit IN ('لتر', 'Liter', 'L', 'liter') THEN 'liter'
  ELSE 'unit'
END;

UPDATE recipe_ingredients 
SET unit = CASE 
  WHEN unit IN ('كيلو', 'Kilogram', 'KG', 'kg') THEN 'kg'
  WHEN unit IN ('قطعة', 'وحدة', 'unit', 'Piece', 'pc', 'piece') THEN 'piece'
  ELSE 'unit'
END;

-- Step 3: Re-apply Inclusive Constraints
-- This allows both English and Arabic going forward
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_unit_check 
  CHECK (unit IN ('kg','piece','liter','pack','gram','unit','كيلو','وحدة','لتر','باكيت','جرام','قطعة'));

ALTER TABLE production_requests ADD CONSTRAINT production_requests_unit_check 
  CHECK (unit IN ('kg','piece','liter','pack','gram','unit','كيلو','وحدة','لتر','باكيت','جرام','قطعة'));

ALTER TABLE production_batches ADD CONSTRAINT production_batches_unit_check 
  CHECK (unit IN ('kg','piece','liter','pack','gram','unit','كيلو','وحدة','لتر','باكيت','جرام','قطعة'));


