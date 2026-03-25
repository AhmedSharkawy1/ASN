-- السكريبت الخاص بربط المطاعم (نظام المطعم الأب والمطاعم الأبناء الفروع)
-- يرجى تشغيل هذا السكريبت في Supabase SQL Editor

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

-- نضمن أن العمود يمكن قراءته بواسطة الجميع
-- Assuming RLS allows reads on restaurants
