-- Supabase Logs Ingest Optimization: Menu Views RPC
-- Run this in Supabase SQL Editor
-- This replaces 3 separate queries with a single atomic database function

CREATE OR REPLACE FUNCTION increment_menu_views(p_restaurant_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_uuid UUID;
  v_enabled BOOLEAN;
  v_plan_key TEXT;
  v_today TEXT;
  v_new_views NUMERIC;
  v_new_today INT;
BEGIN
  -- Cast safely to UUID to avoid operator does not exist: uuid = text (error 42883)
  BEGIN
    v_restaurant_uuid := p_restaurant_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'invalid_uuid');
  END;

  -- 1. Check if tracking is enabled (replaces separate SELECT)
  SELECT views_tracking_enabled INTO v_enabled
  FROM restaurants WHERE id = v_restaurant_uuid;

  IF v_enabled = FALSE THEN
    RETURN json_build_object('success', true, 'skipped', true);
  END IF;

  v_plan_key := 'menu_views_' || p_restaurant_id;
  v_today := to_char(CURRENT_DATE, 'YYYY-MM-DD');

  -- 2. Atomic upsert (replaces separate SELECT + UPSERT)
  INSERT INTO subscription_plans (plan_name, price, billing_cycle, features, is_active)
  VALUES (
    v_plan_key,
    1,
    'views',
    jsonb_build_object(
      'today', 1,
      'date', v_today,
      'last_viewed', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    true
  )
  ON CONFLICT (plan_name) DO UPDATE SET
    price = subscription_plans.price + 1,
    features = (
      CASE
        WHEN subscription_plans.features->>'date' = v_today
        THEN jsonb_set(
          subscription_plans.features,
          '{today}',
          to_jsonb(COALESCE((subscription_plans.features->>'today')::INT, 0) + 1)
        )
        ELSE jsonb_set(
          subscription_plans.features,
          '{today}',
          '1'::jsonb
        )
      END
    ) || jsonb_build_object(
      'date', v_today,
      'last_viewed', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  RETURNING price, (features->>'today')::INT
  INTO v_new_views, v_new_today;

  RETURN json_build_object('success', true, 'views', v_new_views, 'today', v_new_today);
END;
$$;
