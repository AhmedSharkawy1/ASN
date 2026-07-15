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
}
