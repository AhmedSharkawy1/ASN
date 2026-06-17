const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://dphylskqazuytvibiysn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODM4NiwiZXhwIjoyMDg3NjI0Mzg2fQ.vELDlTa0irq1nauUxJxK-UOcbbe_B-GElqdaaAPrnEg'
);
supabase.from('items').update({discount_price: [100, 200]}).eq('id', '11111111-1111-1111-1111-111111111111').then(res => console.log(JSON.stringify(res, null, 2)));
