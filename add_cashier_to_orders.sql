-- ===========================================================
-- إضافة أعمدة الكاشير لجدول الطلبات
-- يرجى تشغيله في Supabase SQL Editor
-- ===========================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name text;

-- (تحديث اختياري) يمكنك إضافة Index لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_orders_cashier ON orders(cashier_id);

-- الانتهاء بنجاح
