-- Fix: Permanently stabilize menu items and categories sort order
-- Run this in Supabase SQL Editor
-- This assigns a unique, sequential sort_order (0, 1, 2, 3...) to all items in each category
-- so that updating an item never changes its position or pushes it to the bottom.

-- 1. Number and fix all items per category
WITH numbered_items AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (
      PARTITION BY category_id 
      ORDER BY 
        CASE WHEN sort_order > 0 THEN sort_order ELSE 999999 END ASC,
        created_at ASC, 
        id ASC
    ) - 1 AS new_order
  FROM public.items
)
UPDATE public.items i
SET sort_order = ni.new_order
FROM numbered_items ni
WHERE i.id = ni.id;

-- 2. Number and fix all categories per restaurant
WITH numbered_cats AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (
      PARTITION BY restaurant_id 
      ORDER BY 
        CASE WHEN sort_order > 0 THEN sort_order ELSE 999999 END ASC,
        created_at ASC, 
        id ASC
    ) - 1 AS new_order
  FROM public.categories
)
UPDATE public.categories c
SET sort_order = nc.new_order
FROM numbered_cats nc
WHERE c.id = nc.id;
