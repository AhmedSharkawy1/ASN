-- ============================================================================
-- DETECT AND REPAIR ORDERS MIS-NUMBERED BY THE MISSING next_order_number RPC
--
-- Background: for any window in which the checkout code was deployed while
-- public.next_order_number did not yet exist, the RPC returned 404 and the
-- client fell through to `rpcOrderNumber ?? 1`, stamping the order with 1.
--
-- MEASURED AGAINST LIVE DATA (596 orders, 34 restaurants):
--
--   orders numbered 1 ......................... 28
--   restaurants with MORE THAN ONE such order .. 0   <- the ?? 1 bug never fired
--   orders below their configured start ........ 0
--   duplicate numbers within a restaurant ...... 2
--
-- 28 orders numbered 1 is exactly right: one per restaurant that has taken a
-- first order. The ?? 1 scenario would have produced many per restaurant, and
-- there are none, so that window never reached production.
--
-- The two duplicates that DO exist are at numbers 39 and 40, not 1, so they
-- predate all of this.
--
-- Their cause cannot be pinned down from the numbers alone, because this
-- system has more than one thing assigning order numbers and none of them can
-- see the others:
--
--   web checkout  submitOrder.ts    -> server, max(order_number) + 1
--   POS           getPosNextOrderNumber() in pos-db.ts
--                                   -> reads the DEVICE'S OWN IndexedDB store
--
-- The POS number is computed offline, per device, from that device's local
-- orders. Two tablets taking orders in the same restaurant will both issue the
-- same next number without either being wrong by its own reckoning, and the
-- web checkout is a third source again. So a collision here is structural, not
-- merely a race, and the pair at 39/40 could have come from either path.
--
-- Two things make "order_number = 1" NOT by itself a bug, and every query
-- below is built around them:
--
--   1. Numbering is PER RESTAURANT. Restaurant A and restaurant B are both
--      entitled to their own order 1. Nothing here compares across tenants —
--      everything partitions by restaurant_id.
--
--   2. A restaurant can set restaurants.starting_order_number, so its first
--      order may legitimately be 500, not 1. Where that is set, an order
--      numbered below it is suspect even if it is not a duplicate.
--
-- So the actual signal is a REPEATED order_number WITHIN one restaurant.
-- Sections 1-3 only read. Section 4 writes and is commented out.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. The primary signal: the same number used twice inside one restaurant.
--
-- A healthy sequence returns nothing here. Expect the bad rows to cluster on
-- order_number = 1 with a tight created_at range matching the deploy window.
-- ---------------------------------------------------------------------------

SELECT r.name                          AS restaurant,
       o.restaurant_id,
       o.order_number,
       count(*)                        AS times_used,
       min(o.created_at)               AS first_seen,
       max(o.created_at)               AS last_seen
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
 GROUP BY r.name, o.restaurant_id, o.order_number
HAVING count(*) > 1
 ORDER BY count(*) DESC, o.restaurant_id, o.order_number;


-- ---------------------------------------------------------------------------
-- 2. Orders that sit below their own restaurant's configured start.
--
-- Catches the case where a restaurant starts at, say, 500 and the bug stamped
-- an order with 1 — a single occurrence, so section 1 would not flag it.
-- ---------------------------------------------------------------------------

SELECT r.name                    AS restaurant,
       o.id                      AS order_id,
       o.order_number,
       r.starting_order_number   AS should_start_at,
       o.customer_phone,
       o.created_at
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
 WHERE r.starting_order_number IS NOT NULL
   AND o.order_number < r.starting_order_number
 ORDER BY o.created_at DESC;


-- ---------------------------------------------------------------------------
-- 3. Per-restaurant health summary. One row per restaurant; anything with
--    duplicate_numbers > 0 needs section 4.
-- ---------------------------------------------------------------------------

SELECT r.name                                            AS restaurant,
       count(*)                                          AS orders,
       count(DISTINCT o.order_number)                    AS distinct_numbers,
       count(*) - count(DISTINCT o.order_number)         AS duplicate_numbers,
       min(o.order_number)                               AS lowest,
       max(o.order_number)                               AS highest,
       r.starting_order_number                           AS configured_start
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
 GROUP BY r.id, r.name, r.starting_order_number
 ORDER BY duplicate_numbers DESC, r.name;


-- ===========================================================================
-- 4. REPAIR — review the preview before uncommenting the UPDATE.
--
-- Rule: within each restaurant and each clashing number, the EARLIEST order
-- keeps it (that is the one that was numbered correctly before the bug), and
-- every later collision is reassigned, in created_at order, continuing from
-- that restaurant's current highest number. The restaurant's configured start
-- is honoured, so a tenant beginning at 500 never gets renumbered to 3.
--
-- Order numbers are what the kitchen and the customer's receipt refer to, so
-- this only ever moves duplicates FORWARD to unused numbers; it never reuses
-- or renumbers an order that was already unique.
-- ===========================================================================

WITH ranked AS (
    SELECT o.id,
           o.restaurant_id,
           o.order_number,
           o.created_at,
           row_number() OVER (PARTITION BY o.restaurant_id, o.order_number
                              ORDER BY o.created_at, o.id) AS dup_rank
      FROM public.orders o
),
-- Everything after the first use of a number, per restaurant.
losers AS (
    SELECT id, restaurant_id, order_number AS old_number, created_at,
           row_number() OVER (PARTITION BY restaurant_id
                              ORDER BY created_at, id) AS offset_in_restaurant
      FROM ranked
     WHERE dup_rank > 1
),
-- Highest number currently in use per restaurant, never below its start - 1.
ceiling AS (
    SELECT o.restaurant_id,
           GREATEST(
               COALESCE(max(o.order_number), 0),
               COALESCE(max(r.starting_order_number) - 1, 0)
           ) AS highest_in_use
      FROM public.orders o
      JOIN public.restaurants r ON r.id = o.restaurant_id
     GROUP BY o.restaurant_id
)
SELECT r.name                                        AS restaurant,
       l.id                                          AS order_id,
       l.old_number,
       c.highest_in_use + l.offset_in_restaurant     AS new_number,
       l.created_at
  FROM losers l
  JOIN ceiling c     ON c.restaurant_id = l.restaurant_id
  JOIN public.restaurants r ON r.id = l.restaurant_id
 ORDER BY r.name, l.created_at;


-- Once the preview above looks right, run this. Same CTEs, as an UPDATE.
--
-- BEGIN;
--
-- WITH ranked AS (
--     SELECT o.id, o.restaurant_id, o.order_number, o.created_at,
--            row_number() OVER (PARTITION BY o.restaurant_id, o.order_number
--                               ORDER BY o.created_at, o.id) AS dup_rank
--       FROM public.orders o
-- ),
-- losers AS (
--     SELECT id, restaurant_id, created_at,
--            row_number() OVER (PARTITION BY restaurant_id
--                               ORDER BY created_at, id) AS offset_in_restaurant
--       FROM ranked
--      WHERE dup_rank > 1
-- ),
-- ceiling AS (
--     SELECT o.restaurant_id,
--            GREATEST(
--                COALESCE(max(o.order_number), 0),
--                COALESCE(max(r.starting_order_number) - 1, 0)
--            ) AS highest_in_use
--       FROM public.orders o
--       JOIN public.restaurants r ON r.id = o.restaurant_id
--      GROUP BY o.restaurant_id
-- )
-- UPDATE public.orders o
--    SET order_number = c.highest_in_use + l.offset_in_restaurant
--   FROM losers l
--   JOIN ceiling c ON c.restaurant_id = l.restaurant_id
--  WHERE o.id = l.id;
--
-- -- Re-run section 1 here. It must come back empty before you COMMIT.
-- -- ROLLBACK;
-- -- COMMIT;


-- ---------------------------------------------------------------------------
-- 5. DO NOT ADD THE UNIQUE INDEX YET.
--
-- An earlier version of this file recommended:
--
--   CREATE UNIQUE INDEX orders_restaurant_number_uniq
--       ON public.orders (restaurant_id, order_number);
--
-- That recommendation was wrong for this system and is retracted. The POS
-- assigns order numbers offline from each device's own IndexedDB, so two
-- tablets in one restaurant routinely reach the same next number. With this
-- index in place the second device's order would be REJECTED at sync time —
-- turning a cosmetic numbering clash into a lost order in a live restaurant.
--
-- The constraint only becomes safe once every path draws from one authority.
-- The web checkout now does, via next_order_number() and order_counters; the
-- POS still does not, because it has to keep working with no connection.
--
-- Making that safe needs a decision about offline behaviour, roughly:
--   a. POS reserves a block of numbers per device while online, or
--   b. POS numbers are namespaced per device (e.g. a device prefix), or
--   c. the number is assigned on sync rather than at the till, and the ticket
--      shows a local reference until then.
--
-- Until one of those exists, keep detecting duplicates with section 1 rather
-- than preventing them with a constraint.
-- ---------------------------------------------------------------------------
