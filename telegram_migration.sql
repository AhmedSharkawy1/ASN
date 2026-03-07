-- Add Telegram notification columns to the restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS telegram_bot_token text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS telegram_chat_id text;
