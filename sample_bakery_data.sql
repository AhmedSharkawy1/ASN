-- ==========================================
-- ASN SaaS - Bakery Sample Data (Kahk & Biscuits)
-- ==========================================
-- This script safely inserts a bakery menu with full inventory, 
-- recipes, and menu items to demonstrate the system flow.
-- Run this in the Supabase SQL Editor.

DO $$ 
DECLARE
  v_rest_id uuid;
  
  -- Raw Materials (Inventory IDs)
  v_butter_id uuid;
  v_sugar_id uuid;
  v_eggs_id uuid;
  v_flour_id uuid;
  v_vermicelli_id uuid;
  v_jam_id uuid;
  v_ghee_id uuid;
  v_yeast_id uuid;
  v_sesame_id uuid;
  
  -- Final Products (Inventory IDs)
  v_biscuit_inv_id uuid;
  v_petitfour_inv_id uuid;
  v_kahk_inv_id uuid;
  v_ghorayeba_inv_id uuid;

  -- Recipes (Recipe IDs)
  v_biscuit_recipe_id uuid;
  v_petitfour_recipe_id uuid;
  v_kahk_recipe_id uuid;
  v_ghorayeba_recipe_id uuid;

  v_category_id uuid;
BEGIN
  -- 1. Create a Sample Restaurant (or use existing)
  SELECT id INTO v_rest_id FROM restaurants WHERE email = 'bakery@asn.com' LIMIT 1;
  IF v_rest_id IS NULL THEN
    INSERT INTO restaurants (name, phone, email, currency) 
    VALUES ('مخبز الأعياد (تطبيقي)', '01011111111', 'bakery@asn.com', 'EGP') 
    RETURNING id INTO v_rest_id;
  END IF;

  -- 2. Clean previous sample data for this restaurant (to allow re-running safely)
  DELETE FROM items WHERE restaurant_id = v_rest_id;
  DELETE FROM categories WHERE restaurant_id = v_rest_id;
  DELETE FROM production_requests WHERE restaurant_id = v_rest_id;
  DELETE FROM inventory_transactions WHERE restaurant_id = v_rest_id;
  DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE restaurant_id = v_rest_id);
  DELETE FROM recipes WHERE restaurant_id = v_rest_id;
  DELETE FROM inventory_items WHERE restaurant_id = v_rest_id;

  -- ==========================================
  -- 3. INVENTORY: RAW MATERIALS (المواد الخام)
  -- ==========================================
  -- Units used: kg, gram, piece

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'زبدة (Butter)', 50, 'kg', 5, 'raw_material', 250) RETURNING id INTO v_butter_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'سكر (Sugar)', 100, 'kg', 10, 'raw_material', 40) RETURNING id INTO v_sugar_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'بيض (Eggs)', 300, 'piece', 30, 'raw_material', 5) RETURNING id INTO v_eggs_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'دقيق (Flour)', 200, 'kg', 20, 'raw_material', 25) RETURNING id INTO v_flour_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'فرمسيل (Vermicelli)', 10, 'kg', 1, 'raw_material', 150) RETURNING id INTO v_vermicelli_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'مربى (Jam)', 15, 'kg', 2, 'raw_material', 60) RETURNING id INTO v_jam_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'سمن بلدي (Ghee)', 30, 'kg', 5, 'raw_material', 350) RETURNING id INTO v_ghee_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'خميرة (Yeast)', 5, 'kg', 1, 'raw_material', 100) RETURNING id INTO v_yeast_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'سمسم (Sesame)', 10, 'kg', 2, 'raw_material', 120) RETURNING id INTO v_sesame_id;


  -- ==========================================
  -- 4. INVENTORY: FINAL PRODUCTS (المنتجات الجاهزة للبيع)
  -- ==========================================

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'بسكويت (جاهز)', 0, 'kg', 5, 'product', 0) RETURNING id INTO v_biscuit_inv_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'بيتيفور (جاهز)', 0, 'kg', 5, 'product', 0) RETURNING id INTO v_petitfour_inv_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'كحك (جاهز)', 0, 'kg', 5, 'product', 0) RETURNING id INTO v_kahk_inv_id;

  INSERT INTO inventory_items (restaurant_id, name, quantity, unit, minimum_stock, item_type, cost_per_unit)
  VALUES (v_rest_id, 'غريبة (جاهزة)', 0, 'kg', 5, 'product', 0) RETURNING id INTO v_ghorayeba_inv_id;


  -- ==========================================
  -- 5. RECIPES & INGREDIENTS (الوصفات والمكونات)
  -- ==========================================
  -- Note: All units are standardized to kg and pieces logic as per requirements.
  -- 1/2 kg = 0.5 kg, 400g = 0.4 kg, 25g = 0.025 kg, etc.
  
  -- Recipe A: 1 الكيلو بسكوت
  -- (0.5 kg butter, 0.4 kg sugar, 11 eggs, 1 kg flour)
  INSERT INTO recipes (restaurant_id, product_name, inventory_item_id)
  VALUES (v_rest_id, 'وصفة 1 كيلو بسكوت', v_biscuit_inv_id) RETURNING id INTO v_biscuit_recipe_id;
  
  INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, quantity, unit) VALUES 
  (v_biscuit_recipe_id, v_butter_id, 0.5, 'kg'),
  (v_biscuit_recipe_id, v_sugar_id, 0.4, 'kg'),
  (v_biscuit_recipe_id, v_eggs_id, 11, 'piece'),
  (v_biscuit_recipe_id, v_flour_id, 1.0, 'kg');

  -- Recipe B: 1 الكيلو بيتيفور
  -- (0.6 kg butter, 0.3 kg sugar, 8 eggs, 1 kg flour, 0.25 kg vermicelli, 0.25 kg jam [estimated jam ratio])
  INSERT INTO recipes (restaurant_id, product_name, inventory_item_id)
  VALUES (v_rest_id, 'وصفة 1 كيلو بيتيفور', v_petitfour_inv_id) RETURNING id INTO v_petitfour_recipe_id;

  INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, quantity, unit) VALUES 
  (v_petitfour_recipe_id, v_butter_id, 0.6, 'kg'),
  (v_petitfour_recipe_id, v_sugar_id, 0.3, 'kg'),
  (v_petitfour_recipe_id, v_eggs_id, 8, 'piece'),
  (v_petitfour_recipe_id, v_flour_id, 1.0, 'kg'),
  (v_petitfour_recipe_id, v_vermicelli_id, 0.25, 'kg'),
  (v_petitfour_recipe_id, v_jam_id, 0.25, 'kg'); -- assuming 1/4 kg jam to match vermicelli for filling

  -- Recipe C: 1 كحك 
  -- (0.5 kg ghee, 0.025 kg sugar, 1 kg flour, 0.025 kg yeast, 0.05 kg sesame)
  INSERT INTO recipes (restaurant_id, product_name, inventory_item_id)
  VALUES (v_rest_id, 'وصفة 1 كيلو كحك', v_kahk_inv_id) RETURNING id INTO v_kahk_recipe_id;

  INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, quantity, unit) VALUES 
  (v_kahk_recipe_id, v_ghee_id, 0.5, 'kg'),
  (v_kahk_recipe_id, v_sugar_id, 0.025, 'kg'),
  (v_kahk_recipe_id, v_flour_id, 1.0, 'kg'),
  (v_kahk_recipe_id, v_yeast_id, 0.025, 'kg'),
  (v_kahk_recipe_id, v_sesame_id, 0.05, 'kg');

  -- Recipe D: 1 غريبة
  -- (0.7 kg butter, 0.25 kg sugar, 1 kg flour)
  INSERT INTO recipes (restaurant_id, product_name, inventory_item_id)
  VALUES (v_rest_id, 'وصفة 1 كيلو غريبة', v_ghorayeba_inv_id) RETURNING id INTO v_ghorayeba_recipe_id;

  INSERT INTO recipe_ingredients (recipe_id, inventory_item_id, quantity, unit) VALUES 
  (v_ghorayeba_recipe_id, v_butter_id, 0.7, 'kg'),
  (v_ghorayeba_recipe_id, v_sugar_id, 0.25, 'kg'),
  (v_ghorayeba_recipe_id, v_flour_id, 1.0, 'kg');


  -- ==========================================
  -- 6. MENU CATEGORIES & ITEMS (أقسام وعناصر المنيو)
  -- ==========================================

  INSERT INTO categories (restaurant_id, name, sort_order, is_active)
  VALUES (v_rest_id, 'كحك وبسكويت العيد', 1, true) RETURNING id INTO v_category_id;

  -- Menu Item: Biscuit
  INSERT INTO items (
    restaurant_id, category_id, title, description, price, 
    inventory_item_id, recipe_id, 
    is_active, sort_order
  ) VALUES (
    v_rest_id, v_category_id, '1 كيلو بسكويت فاخر', 'بسكويت العيد بالزبدة الفاخرة', 250, 
    v_biscuit_inv_id, v_biscuit_recipe_id, true, 1
  );

  -- Menu Item: Petit Four
  INSERT INTO items (
    restaurant_id, category_id, title, description, price, 
    inventory_item_id, recipe_id, 
    is_active, sort_order
  ) VALUES (
    v_rest_id, v_category_id, '1 كيلو بيتيفور مشكل', 'بيتيفور بالمربى والفرمسيل', 300, 
    v_petitfour_inv_id, v_petitfour_recipe_id, true, 2
  );

  -- Menu Item: Kahk
  INSERT INTO items (
    restaurant_id, category_id, title, description, price, 
    inventory_item_id, recipe_id, 
    is_active, sort_order
  ) VALUES (
    v_rest_id, v_category_id, '1 كيلو كحك العيد', 'كحك بالسمن البلدي الأصلي', 280, 
    v_kahk_inv_id, v_kahk_recipe_id, true, 3
  );

  -- Menu Item: Ghorayeba
  INSERT INTO items (
    restaurant_id, category_id, title, description, price, 
    inventory_item_id, recipe_id, 
    is_active, sort_order
  ) VALUES (
    v_rest_id, v_category_id, '1 كيلو غريبة ممتازة', 'غريبة ناعمة بالزبدة', 270, 
    v_ghorayeba_inv_id, v_ghorayeba_recipe_id, true, 4
  );

END $$;
