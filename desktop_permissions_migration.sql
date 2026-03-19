ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS desktop_permissions JSONB DEFAULT '{
  "orders": true,
  "products": true,
  "inventory": true,
  "finance": true,
  "admin": true,
  "settings": true
}'::JSONB;
