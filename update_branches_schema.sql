-- السكريبت الخاص بتحديث جدول الفروع (Branches) لدعم النظام الجديد
-- يرجى تشغيل هذا السكريبت في Supabase SQL Editor

ALTER TABLE branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- نضمن أن كل الفروع الموجودة حالياً مفعلة كافتراضي
UPDATE branches SET is_active = true WHERE is_active IS NULL;
UPDATE branches SET is_main = false WHERE is_main IS NULL;
