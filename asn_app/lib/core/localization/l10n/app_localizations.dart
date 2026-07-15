import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In ar, this message translates to:
  /// **'مطعم ASN'**
  String get appName;

  /// No description provided for @loginTitle.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الدخول'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'أدخل بياناتك للمتابعة إلى حسابك'**
  String get loginSubtitle;

  /// No description provided for @usernameOrEmail.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني أو اسم المستخدم'**
  String get usernameOrEmail;

  /// No description provided for @password.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور'**
  String get password;

  /// No description provided for @forgotPassword.
  ///
  /// In ar, this message translates to:
  /// **'نسيت كلمة المرور؟'**
  String get forgotPassword;

  /// No description provided for @signInButton.
  ///
  /// In ar, this message translates to:
  /// **'دخول'**
  String get signInButton;

  /// No description provided for @signingIn.
  ///
  /// In ar, this message translates to:
  /// **'جاري الدخول...'**
  String get signingIn;

  /// No description provided for @offlineWarning.
  ///
  /// In ar, this message translates to:
  /// **'أنت غير متصل بالإنترنت. تأكد من البيانات أو اتصل بالإنترنت أولاً.'**
  String get offlineWarning;

  /// No description provided for @dashboard.
  ///
  /// In ar, this message translates to:
  /// **'الرئيسية'**
  String get dashboard;

  /// No description provided for @orders.
  ///
  /// In ar, this message translates to:
  /// **'الطلبات'**
  String get orders;

  /// No description provided for @pos.
  ///
  /// In ar, this message translates to:
  /// **'نظام البيع (POS)'**
  String get pos;

  /// No description provided for @kitchen.
  ///
  /// In ar, this message translates to:
  /// **'شاشة المطبخ'**
  String get kitchen;

  /// No description provided for @products.
  ///
  /// In ar, this message translates to:
  /// **'المنتجات'**
  String get products;

  /// No description provided for @categories.
  ///
  /// In ar, this message translates to:
  /// **'الأقسام'**
  String get categories;

  /// No description provided for @customers.
  ///
  /// In ar, this message translates to:
  /// **'العملاء'**
  String get customers;

  /// No description provided for @reports.
  ///
  /// In ar, this message translates to:
  /// **'التقارير'**
  String get reports;

  /// No description provided for @settings.
  ///
  /// In ar, this message translates to:
  /// **'الإعدادات'**
  String get settings;

  /// No description provided for @logout.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الخروج'**
  String get logout;

  /// No description provided for @themeMode.
  ///
  /// In ar, this message translates to:
  /// **'المظهر'**
  String get themeMode;

  /// No description provided for @language.
  ///
  /// In ar, this message translates to:
  /// **'اللغة'**
  String get language;

  /// No description provided for @arabic.
  ///
  /// In ar, this message translates to:
  /// **'العربية'**
  String get arabic;

  /// No description provided for @english.
  ///
  /// In ar, this message translates to:
  /// **'الإنجليزية'**
  String get english;

  /// No description provided for @light.
  ///
  /// In ar, this message translates to:
  /// **'فاتح'**
  String get light;

  /// No description provided for @dark.
  ///
  /// In ar, this message translates to:
  /// **'مظلم'**
  String get dark;

  /// No description provided for @system.
  ///
  /// In ar, this message translates to:
  /// **'تلقائي'**
  String get system;

  /// No description provided for @noOrders.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد طلبات حالياً'**
  String get noOrders;

  /// No description provided for @newOrderAlert.
  ///
  /// In ar, this message translates to:
  /// **'🛍️ طلب جديد!'**
  String get newOrderAlert;

  /// No description provided for @orderNumber.
  ///
  /// In ar, this message translates to:
  /// **'طلب رقم #{number}'**
  String orderNumber(Object number);

  /// No description provided for @total.
  ///
  /// In ar, this message translates to:
  /// **'الإجمالي'**
  String get total;

  /// No description provided for @subtotal.
  ///
  /// In ar, this message translates to:
  /// **'الإجمالي الفرعي'**
  String get subtotal;

  /// No description provided for @discount.
  ///
  /// In ar, this message translates to:
  /// **'الخصم'**
  String get discount;

  /// No description provided for @deliveryFee.
  ///
  /// In ar, this message translates to:
  /// **'رسوم التوصيل'**
  String get deliveryFee;

  /// No description provided for @statusPending.
  ///
  /// In ar, this message translates to:
  /// **'قيد الانتظار'**
  String get statusPending;

  /// No description provided for @statusInProgress.
  ///
  /// In ar, this message translates to:
  /// **'تحت التنفيذ'**
  String get statusInProgress;

  /// No description provided for @statusCompleted.
  ///
  /// In ar, this message translates to:
  /// **'مكتمل'**
  String get statusCompleted;

  /// No description provided for @statusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغي'**
  String get statusCancelled;

  /// No description provided for @paymentCash.
  ///
  /// In ar, this message translates to:
  /// **'نقداً'**
  String get paymentCash;

  /// No description provided for @paymentCard.
  ///
  /// In ar, this message translates to:
  /// **'بطاقة'**
  String get paymentCard;

  /// No description provided for @customerName.
  ///
  /// In ar, this message translates to:
  /// **'الاسم'**
  String get customerName;

  /// No description provided for @customerPhone.
  ///
  /// In ar, this message translates to:
  /// **'الهاتف'**
  String get customerPhone;

  /// No description provided for @customerAddress.
  ///
  /// In ar, this message translates to:
  /// **'العنوان'**
  String get customerAddress;

  /// No description provided for @syncAndRefresh.
  ///
  /// In ar, this message translates to:
  /// **'مزامنة وتحديث'**
  String get syncAndRefresh;

  /// No description provided for @offlineMode.
  ///
  /// In ar, this message translates to:
  /// **'وضع غير متصل بالإنترنت'**
  String get offlineMode;

  /// No description provided for @retryButton.
  ///
  /// In ar, this message translates to:
  /// **'إعادة المحاولة'**
  String get retryButton;

  /// No description provided for @errorOccurred.
  ///
  /// In ar, this message translates to:
  /// **'حدث خطأ غير متوقع'**
  String get errorOccurred;

  /// No description provided for @sessionExpired.
  ///
  /// In ar, this message translates to:
  /// **'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'**
  String get sessionExpired;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
