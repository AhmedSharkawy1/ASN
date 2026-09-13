-- WhatsApp Business API Integration Migration
-- Adds columns to restaurants table for WhatsApp Cloud API credentials

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_integration_enabled BOOLEAN DEFAULT false;

-- Optional: Add a table to log sent WhatsApp messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
    wa_message_id TEXT, -- WhatsApp message ID returned from API
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_restaurant ON whatsapp_messages(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);

-- RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurants can view own whatsapp messages"
    ON whatsapp_messages FOR SELECT
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE email = auth.jwt()->>'email'));

CREATE POLICY "Restaurants can insert own whatsapp messages"
    ON whatsapp_messages FOR INSERT
    WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE email = auth.jwt()->>'email'));

-- Service role bypass for API routes
CREATE POLICY "Service role full access whatsapp_messages"
    ON whatsapp_messages FOR ALL
    USING (auth.role() = 'service_role');
