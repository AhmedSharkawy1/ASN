-- Promo codes (coupons) for offers.
--
-- An offer with a code only applies when the customer types that code; an
-- offer without one keeps applying automatically, exactly as before. The
-- column is nullable with no default, so every existing offer stays automatic
-- and nothing about current behaviour changes.
--
-- Safe to run more than once.

ALTER TABLE public.promotions
    ADD COLUMN IF NOT EXISTS promo_code text;

COMMENT ON COLUMN public.promotions.promo_code IS
    'Coupon code required for this offer. NULL means the offer applies automatically.';

-- Codes are compared case-insensitively, so "SAVE10" and "save10" must not be
-- two different coupons inside one restaurant. Partial index: offers without a
-- code are unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS promotions_restaurant_promo_code_key
    ON public.promotions (restaurant_id, lower(promo_code))
    WHERE promo_code IS NOT NULL;

-- Verify: should list the new column, plus the index.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'promotions'
  AND column_name = 'promo_code';

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'promotions'
  AND indexname = 'promotions_restaurant_promo_code_key';
