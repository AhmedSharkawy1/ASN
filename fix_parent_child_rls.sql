-- ===========================================================
-- إصلاح صلاحيات الفروع: سكريبت السماح بالتنقل بين المطعم الأب والفرع
-- يرجى تشغيله في Supabase SQL Editor
-- ===========================================================

-- 1. إنشاء دالة للتحقق مما إذا كان المطعم هو "فرع" تابع لحسابي
CREATE OR REPLACE FUNCTION is_my_child_tenant(check_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
  my_root_id uuid;
BEGIN
  -- الحصول على رقم المطعم الأساسي الخاص بي
  my_root_id := get_my_tenant_id();
  
  -- إذا لم أكن أمتلك مطعماً رئيسياً، فأنا لست أباً لأحد
  IF my_root_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- إرجاع "صحيح" إذا كان هذا المطعم (check_id) فرعاً تابعاً لمطعمي
  RETURN EXISTS (
    SELECT 1 FROM restaurants 
    WHERE id = check_id 
    AND parent_id = my_root_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. سياسة إضافية لجدول المطاعم للسماح بقراءة بيانات الفرع
DROP POLICY IF EXISTS pci_access_restaurants ON restaurants;
CREATE POLICY pci_access_restaurants ON restaurants
FOR ALL TO authenticated
USING (is_my_child_tenant(id));

-- 3. تطبيق السياسة تلقائياً على كل الجداول التي تحتوي على tenant_id أو restaurant_id
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT DISTINCT table_name 
    FROM information_schema.columns 
    WHERE column_name IN ('tenant_id', 'restaurant_id') 
      AND table_schema = 'public'
      AND table_name != 'restaurants'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS pci_access_%I ON %I', t, t);
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'tenant_id') THEN
        EXECUTE format('CREATE POLICY pci_access_%I ON %I FOR ALL TO authenticated USING (is_my_child_tenant(tenant_id))', t, t);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'restaurant_id') THEN
        EXECUTE format('CREATE POLICY pci_access_%I ON %I FOR ALL TO authenticated USING (is_my_child_tenant(restaurant_id))', t, t);
    END IF;
  END LOOP;
END;
$$;

-- الانتهاء بنجاح
