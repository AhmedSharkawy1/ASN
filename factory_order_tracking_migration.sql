-- Migration to track individual orders in the factory production queue

ALTER TABLE production_requests
ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

COMMENT ON COLUMN production_requests.order_id IS 'Links the production request to the specific order that triggered it.';
