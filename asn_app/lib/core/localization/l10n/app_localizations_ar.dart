// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'مطعم ASN';

  @override
  String get loginTitle => 'تسجيل الدخول';

  @override
  String get loginSubtitle => 'أدخل بياناتك للمتابعة إلى حسابك';

  @override
  String get usernameOrEmail => 'البريد الإلكتروني أو اسم المستخدم';

  @override
  String get password => 'كلمة المرور';

  @override
  String get forgotPassword => 'نسيت كلمة المرور؟';

  @override
  String get signInButton => 'دخول';

  @override
  String get signingIn => 'جاري الدخول...';

  @override
  String get offlineWarning =>
      'أنت غير متصل بالإنترنت. تأكد من البيانات أو اتصل بالإنترنت أولاً.';

  @override
  String get dashboard => 'الرئيسية';

  @override
  String get orders => 'الطلبات';

  @override
  String get pos => 'نظام البيع (POS)';

  @override
  String get kitchen => 'شاشة المطبخ';

  @override
  String get products => 'المنتجات';

  @override
  String get categories => 'الأقسام';

  @override
  String get customers => 'العملاء';

  @override
  String get reports => 'التقارير';

  @override
  String get settings => 'الإعدادات';

  @override
  String get logout => 'تسجيل الخروج';

  @override
  String get themeMode => 'المظهر';

  @override
  String get language => 'اللغة';

  @override
  String get arabic => 'العربية';

  @override
  String get english => 'الإنجليزية';

  @override
  String get light => 'فاتح';

  @override
  String get dark => 'مظلم';

  @override
  String get system => 'تلقائي';

  @override
  String get noOrders => 'لا توجد طلبات حالياً';

  @override
  String get newOrderAlert => '🛍️ طلب جديد!';

  @override
  String orderNumber(Object number) {
    return 'طلب رقم #$number';
  }

  @override
  String get total => 'الإجمالي';

  @override
  String get subtotal => 'الإجمالي الفرعي';

  @override
  String get discount => 'الخصم';

  @override
  String get deliveryFee => 'رسوم التوصيل';

  @override
  String get statusPending => 'قيد الانتظار';

  @override
  String get statusInProgress => 'تحت التنفيذ';

  @override
  String get statusCompleted => 'مكتمل';

  @override
  String get statusCancelled => 'ملغي';

  @override
  String get paymentCash => 'نقداً';

  @override
  String get paymentCard => 'بطاقة';

  @override
  String get customerName => 'الاسم';

  @override
  String get customerPhone => 'الهاتف';

  @override
  String get customerAddress => 'العنوان';

  @override
  String get syncAndRefresh => 'مزامنة وتحديث';

  @override
  String get offlineMode => 'وضع غير متصل بالإنترنت';

  @override
  String get retryButton => 'إعادة المحاولة';

  @override
  String get errorOccurred => 'حدث خطأ غير متوقع';

  @override
  String get sessionExpired => 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.';

  @override
  String get save => 'حفظ';

  @override
  String get cancel => 'إلغاء';

  @override
  String get edit => 'تعديل';

  @override
  String get delete => 'حذف';

  @override
  String get deleteConfirmTitle => 'هل تريد حذف هذا العنصر؟';

  @override
  String get fieldRequired => 'هذا الحقل مطلوب';

  @override
  String get searchHint => 'بحث...';

  @override
  String get notes => 'ملاحظات';

  @override
  String get active => 'نشط';

  @override
  String get inactive => 'غير نشط';

  @override
  String get startDate => 'تاريخ البداية';

  @override
  String get endDate => 'تاريخ النهاية';

  @override
  String get description => 'الوصف';

  @override
  String get nameArabic => 'الاسم (عربي)';

  @override
  String get nameEnglish => 'الاسم (إنجليزي)';

  @override
  String get inventory => 'المخزون';

  @override
  String get noInventoryItems => 'لا توجد عناصر في المخزون.';

  @override
  String get lowStock => 'مخزون منخفض';

  @override
  String get addItem => 'إضافة عنصر';

  @override
  String get itemName => 'اسم العنصر';

  @override
  String get quantity => 'الكمية';

  @override
  String get unit => 'الوحدة';

  @override
  String get minimumStock => 'الحد الأدنى للمخزون';

  @override
  String get costPerUnit => 'تكلفة الوحدة';

  @override
  String get supplier => 'المورد';

  @override
  String get tables => 'الطاولات';

  @override
  String get noTables => 'لا توجد طاولات مضافة.';

  @override
  String get addTable => 'إضافة طاولة';

  @override
  String get tableLabel => 'اسم الطاولة';

  @override
  String get capacity => 'السعة';

  @override
  String get tableAvailable => 'متاحة';

  @override
  String get tableOccupied => 'مشغولة';

  @override
  String get tableReserved => 'محجوزة';

  @override
  String get tableMerged => 'مدموجة';

  @override
  String get delivery => 'مناطق التوصيل';

  @override
  String get noDeliveryZones => 'لا توجد مناطق توصيل مضافة.';

  @override
  String get addZone => 'إضافة منطقة';

  @override
  String get zoneNameAr => 'اسم المنطقة (عربي)';

  @override
  String get zoneNameEn => 'اسم المنطقة (إنجليزي)';

  @override
  String get minOrder => 'الحد الأدنى للطلب';

  @override
  String get estimatedTimeMin => 'الوقت المتوقع (بالدقائق)';

  @override
  String get minutesShort => 'دقيقة';

  @override
  String get promotions => 'العروض والخصومات';

  @override
  String get noPromotions => 'لا توجد عروض مضافة.';

  @override
  String get addPromotion => 'إضافة عرض';

  @override
  String get discountType => 'نوع الخصم';

  @override
  String get discountValue => 'قيمة الخصم';

  @override
  String get fixedAmount => 'مبلغ ثابت';

  @override
  String get percentage => 'نسبة مئوية';

  @override
  String get freeShipping => 'توصيل مجاني';

  @override
  String get expired => 'منتهي';

  @override
  String get hr => 'الموارد البشرية';

  @override
  String get employees => 'الموظفين';

  @override
  String get attendance => 'الحضور';

  @override
  String get noEmployees => 'لا يوجد موظفين.';

  @override
  String get noAttendanceToday => 'لا توجد سجلات حضور اليوم.';

  @override
  String get present => 'حاضر';

  @override
  String get late => 'متأخر';

  @override
  String get absent => 'غائب';

  @override
  String get earlyLeave => 'انصراف مبكر';

  @override
  String get checkIn => 'حضور';

  @override
  String get checkOut => 'انصراف';

  @override
  String get hoursShort => 'ساعة';

  @override
  String get noCustomers => 'لا يوجد عملاء.';

  @override
  String get addCustomer => 'إضافة عميل';

  @override
  String get quickActions => 'الوصول السريع';

  @override
  String get welcomeBack => 'أهلاً بعودتك';

  @override
  String get noProducts => 'لا توجد منتجات في القائمة.';

  @override
  String get addProduct => 'إضافة منتج';

  @override
  String get category => 'القسم';

  @override
  String get allCategories => 'الكل';

  @override
  String get manageCategories => 'إدارة الأقسام';

  @override
  String get addCategory => 'إضافة قسم';

  @override
  String get sizesAndPrices => 'الأحجام والأسعار';

  @override
  String get addSize => 'إضافة حجم';

  @override
  String get sizeLabel => 'اسم الحجم';

  @override
  String get oldPrice => 'السعر قبل الخصم';

  @override
  String get popular => 'مميز';

  @override
  String get spicy => 'حار';

  @override
  String get available => 'متاح';

  @override
  String get outOfStock => 'غير متاح';

  @override
  String get uploadImage => 'رفع صورة';

  @override
  String get uploadingImage => 'جاري الرفع...';

  @override
  String get priceFrom => 'يبدأ من';

  @override
  String get price => 'السعر';

  @override
  String get currentOrder => 'الطلب الحالي';

  @override
  String get cartEmpty => 'السلة فارغة';

  @override
  String get clearCart => 'تفريغ السلة';

  @override
  String get checkout => 'إتمام الطلب';

  @override
  String get chooseSize => 'اختر الحجم';

  @override
  String get orderTypeLabel => 'نوع الطلب';

  @override
  String get dineIn => 'صالة';

  @override
  String get takeaway => 'تيك أواي';

  @override
  String get deliveryOrder => 'دليفري';

  @override
  String get deposit => 'عربون';

  @override
  String get depositAmount => 'قيمة العربون';

  @override
  String get customerInfo => 'بيانات العميل';

  @override
  String get orderPlaced => 'تم إنشاء الطلب بنجاح!';

  @override
  String get itemsLabel => 'الأصناف';

  @override
  String get viewCart => 'عرض السلة';

  @override
  String get paymentMethod => 'طريقة الدفع';

  @override
  String get rangeToday => 'اليوم';

  @override
  String get range7d => 'آخر 7 أيام';

  @override
  String get range30d => 'آخر 30 يوماً';

  @override
  String get revenue => 'الإيرادات';

  @override
  String get totalOrders => 'الطلبات';

  @override
  String get avgOrderValue => 'متوسط الطلب';

  @override
  String get cancelledOrders => 'الملغاة';

  @override
  String get revenueTrend => 'منحنى الإيرادات';

  @override
  String get topProducts => 'الأكثر مبيعاً';

  @override
  String get paymentBreakdown => 'طرق الدفع';

  @override
  String get orderTypeBreakdown => 'أنواع الطلبات';

  @override
  String get soldCount => 'مباع';

  @override
  String get allCaughtUp => 'كل شيء تمام! لا توجد طلبات نشطة.';

  @override
  String get startPreparing => 'بدء التحضير';

  @override
  String get markReady => 'جاهز للتسليم';

  @override
  String get markCompleted => 'إنهاء الطلب';

  @override
  String get callCustomer => 'اتصل بالعميل';

  @override
  String get statusReady => 'جاهز';

  @override
  String get preferences => 'التفضيلات';

  @override
  String get account => 'الحساب';

  @override
  String get aboutApp => 'عن التطبيق';

  @override
  String get logoutConfirm => 'هل أنت متأكد من تسجيل الخروج؟';

  @override
  String get version => 'الإصدار';

  @override
  String get sortItems => 'ترتيب الأصناف';

  @override
  String get dragToReorder => 'اسحب الأصناف لإعادة ترتيبها ثم احفظ.';

  @override
  String get emoji => 'الرمز التعبيري';

  @override
  String get recentOrders => 'أحدث الطلبات';

  @override
  String get todayAtGlance => 'ملخص اليوم';

  @override
  String get qrTitle => 'رمز QR';

  @override
  String get menuQr => 'QR القائمة';

  @override
  String get tableQr => 'QR الطاولة';

  @override
  String get wholeMenu => 'القائمة كاملة';

  @override
  String get scanToOrder => 'امسح الرمز لعرض القائمة والطلب';

  @override
  String get copyLink => 'نسخ الرابط';

  @override
  String get linkCopied => 'تم نسخ الرابط';

  @override
  String get openMenu => 'فتح القائمة';

  @override
  String get selectTable => 'اختر الطاولة';

  @override
  String get recipes => 'الوصفات';

  @override
  String get noRecipes => 'لا توجد وصفات.';

  @override
  String get addRecipe => 'إضافة وصفة';

  @override
  String get productName => 'اسم المنتج';

  @override
  String get productCost => 'تكلفة المنتج';

  @override
  String get ingredients => 'المكونات';

  @override
  String get addIngredient => 'إضافة مكوّن';

  @override
  String get ingredient => 'المكوّن';

  @override
  String get noIngredients => 'لا توجد مكونات بعد.';
}
