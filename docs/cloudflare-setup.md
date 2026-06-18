# دليل إعداد Cloudflare لتحسين أداء الصور وتقليل Egress في Supabase

لتقليل استهلاك الـ Bandwidth و Egress في Supabase إلى الصفر تقريباً للطلبات المتكررة، سنقوم بتوجيه حركة مرور صور Supabase عبر شبكة Cloudflare لتخزينها مؤقتاً (Cache) على الـ Edge Servers لمدة سنة كاملة وتفعيل ميزات الضغط المتقدمة.

---

## 1. إعداد قواعد التخزين المؤقت (Cloudflare Cache Rules)

قم بالدخول إلى لوحة تحكم Cloudflare واختيار موقعك، ثم توجه إلى **Caching** > **Cache Rules** وأنشئ القواعد التالية:

### القاعدة الأولى: تخزين ملفات Supabase Storage مؤقتاً
* **اسم القاعدة (Rule Name):** `Supabase Storage CDN Caching`
* **الشرط (If incoming requests match):**
  * Custom filter expression: 
    * Field: `URI Path`
    * Operator: `contains`
    * Value: `/storage/v1/object/public/`
* **الإجراء (Then apply):**
  * **Cache eligibility:** Eligible for cache
  * **Edge TTL:**
    * Setting: Override to constant
    * Value: `1 year` (أو `31536000` ثانية)
  * **Browser TTL:**
    * Setting: Override to constant
    * Value: `1 year` (أو `31536000` ثانية)
  * **Respect Strong ETags:** On
  * **Respect Origin Cache-Control Headers:** Off *(هذا يضمن تجاهل أي إعداداتOrigin ويفرض سنة كاملة)*

---

### القاعدة الثانية: تخزين امتدادات الصور مؤقتاً (Cache Everything)
* **اسم القاعدة (Rule Name):** `Cache Static Images Everywhere`
* **الشرط (If incoming requests match):**
  * Custom filter expression (استخدم OR للربط):
    * `URI Path` ends with `.jpg` OR
    * `URI Path` ends with `.jpeg` OR
    * `URI Path` ends with `.png` OR
    * `URI Path` ends with `.webp` OR
    * `URI Path` ends with `.avif`
* **الإجراء (Then apply):**
  * **Cache eligibility:** Eligible for cache
  * **Edge TTL:** Override to constant -> `1 year`
  * **Browser TTL:** Override to constant -> `1 year`

---

## 2. تفعيل تحسين الصور (Cloudflare Polish & Mirage)

تعمل هذه الميزات على ضغط الصور تلقائياً وتحويل صيغها بالاعتماد على متصفح الزائر لتقليل الحجم.

توجه إلى **Speed** > **Optimization** في لوحة تحكم Cloudflare:

### أ. تفعيل Cloudflare Polish
* ابحث عن قسم **Polish**.
* قم بتفعيل الخيار واختيار **Lossy** (يقوم بضغط الصور مع الحفاظ على مظهرها الجمالي دون خسارة ملحوظة في الجودة).
* تفعيل خيار **WebP** (تحويل الصور تلقائياً إلى صيغة WebP للمتصفحات التي تدعمها).
* تفعيل خيار **AVIF** (تحويل الصور تلقائياً إلى صيغة AVIF الأكثر ضغطاً للمتصفحات الداعمة - *يتطلب اشتراك Pro فما فوق*).

### ب. تفعيل Mirage
* ابحث عن قسم **Mirage** (يساعد في تسريع تحميل الصور على شبكات الجيل الثالث والهواتف الضعيفة عن طريق عرض صور منخفضة الدقة مؤقتاً لحين تحميل الصورة الأصلية وتجميع طلبات الصور في طلب واحد).
* قم بتشغيل خيار **Mirage**.

---

## 3. التأكد من صحة التفعيل (Verification)

لاختبار أن التخزين المؤقت يعمل بنجاح من Cloudflare:
1. افتح أي صفحة منيو.
2. انقر بزر الفأرة الأيمن واختر **Inspect** ثم توجه إلى تبويب **Network**.
3. اضغط على أي صورة من صور المنيو القادمة من Supabase.
4. افحص الـ **Response Headers**:
   * يجب أن ترى الـ Header التالي: `cf-cache-status: HIT` أو `cf-cache-status: REVALIDATED` (بعد الطلب الثاني أو الثالث).
   * يجب أن يظهر الـ Header التالي: `cache-control: public, max-age=31536000, immutable`.
