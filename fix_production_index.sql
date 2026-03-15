-- Drop the unique index that was preventing multiple pending production requests for the same item/date
-- This allows each order to have its own discrete production request
DROP INDEX IF EXISTS idx_production_requests_aggregate;
