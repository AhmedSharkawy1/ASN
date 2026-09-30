-- ============================================================================
-- Migration: Add 'buy_x_get_y' to promotions discount_type check constraint
-- Safe and idempotent: drops old check constraint and adds the updated one.
-- ============================================================================

ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_discount_type_check;

ALTER TABLE public.promotions
    ADD CONSTRAINT promotions_discount_type_check
    CHECK (discount_type IN ('fixed_amount', 'percentage', 'free_shipping', 'buy_x_get_y'));

COMMENT ON COLUMN public.promotions.discount_type IS
    'Type of discount: fixed_amount, percentage, free_shipping, or buy_x_get_y (Buy X Get Y Free)';

-- Verification query
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.promotions'::regclass
  AND conname = 'promotions_discount_type_check';
