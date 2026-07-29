-- Backfill the discount on historical website orders.
--
-- submitOrder used to write the discount only to `discount_amount`, but the
-- dashboard, the reports and the mobile app all read `discount` — and nothing
-- ever read the other name. Every discount given on the website therefore
-- showed as zero. Order totals were always correct; only the discount figure
-- was missing, so this restores reporting without changing what any customer
-- was charged.
--
-- New orders are already written to both columns.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — PREVIEW. Run this on its own first and read the output.
-- ─────────────────────────────────────────────────────────────────────────────

-- How many rows would change, and for how much money in total.
SELECT
    count(*)                    AS orders_to_fix,
    sum(discount_amount)        AS total_discount_to_restore,
    min(created_at)::date       AS oldest,
    max(created_at)::date       AS newest
FROM public.orders
WHERE discount_amount IS NOT NULL
  AND discount_amount > 0
  AND coalesce(discount, 0) = 0;

-- A sample to eyeball. The rewritten total must equal the stored total: if
-- subtotal - discount_amount + delivery_fee already matches `total`, then the
-- customer was charged with the discount applied and only the column is wrong.
SELECT
    order_number,
    created_at::date AS placed,
    subtotal,
    discount            AS discount_now,
    discount_amount     AS discount_should_be,
    delivery_fee,
    total,
    (subtotal - discount_amount + coalesce(delivery_fee, 0)) AS total_recomputed,
    (subtotal - discount_amount + coalesce(delivery_fee, 0)) = total AS adds_up
FROM public.orders
WHERE discount_amount IS NOT NULL
  AND discount_amount > 0
  AND coalesce(discount, 0) = 0
ORDER BY created_at DESC
LIMIT 25;

-- Rows where the maths does NOT add up. Expect zero. Anything here means the
-- order's total was not calculated the way assumed above, so STOP and check it
-- before running step 2.
SELECT
    order_number, subtotal, discount_amount, delivery_fee, total,
    (subtotal - discount_amount + coalesce(delivery_fee, 0)) AS total_recomputed
FROM public.orders
WHERE discount_amount IS NOT NULL
  AND discount_amount > 0
  AND coalesce(discount, 0) = 0
  AND (subtotal - discount_amount + coalesce(delivery_fee, 0)) <> total;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — THE FIX. Only after the preview looks right.
--
-- Copies the value across; it does not recalculate anything, so no total,
-- subtotal or payment is touched. Restricted to rows whose `discount` is still
-- empty, so a till order (which always wrote `discount`) is never overwritten,
-- and re-running it changes nothing.
--
-- Uncomment the block below to run it.
-- ─────────────────────────────────────────────────────────────────────────────

-- BEGIN;
--
-- UPDATE public.orders
-- SET discount = discount_amount
-- WHERE discount_amount IS NOT NULL
--   AND discount_amount > 0
--   AND coalesce(discount, 0) = 0;
--
-- -- Should now return 0.
-- SELECT count(*) AS still_unfixed
-- FROM public.orders
-- WHERE discount_amount IS NOT NULL
--   AND discount_amount > 0
--   AND coalesce(discount, 0) = 0;
--
-- -- Read the count above. COMMIT to keep the change, or ROLLBACK to undo it.
-- COMMIT;
