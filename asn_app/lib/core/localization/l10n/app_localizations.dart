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

  /// No description provided for @save.
  ///
  /// In ar, this message translates to:
  /// **'حفظ'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء'**
  String get cancel;

  /// No description provided for @edit.
  ///
  /// In ar, this message translates to:
  /// **'تعديل'**
  String get edit;

  /// No description provided for @delete.
  ///
  /// In ar, this message translates to:
  /// **'حذف'**
  String get delete;

  /// No description provided for @deleteConfirmTitle.
  ///
  /// In ar, this message translates to:
  /// **'هل تريد حذف هذا العنصر؟'**
  String get deleteConfirmTitle;

  /// No description provided for @fieldRequired.
  ///
  /// In ar, this message translates to:
  /// **'هذا الحقل مطلوب'**
  String get fieldRequired;

  /// No description provided for @searchHint.
  ///
  /// In ar, this message translates to:
  /// **'بحث...'**
  String get searchHint;

  /// No description provided for @notes.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظات'**
  String get notes;

  /// No description provided for @active.
  ///
  /// In ar, this message translates to:
  /// **'نشط'**
  String get active;

  /// No description provided for @inactive.
  ///
  /// In ar, this message translates to:
  /// **'غير نشط'**
  String get inactive;

  /// No description provided for @startDate.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ البداية'**
  String get startDate;

  /// No description provided for @endDate.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ النهاية'**
  String get endDate;

  /// No description provided for @description.
  ///
  /// In ar, this message translates to:
  /// **'الوصف'**
  String get description;

  /// No description provided for @nameArabic.
  ///
  /// In ar, this message translates to:
  /// **'الاسم (عربي)'**
  String get nameArabic;

  /// No description provided for @nameEnglish.
  ///
  /// In ar, this message translates to:
  /// **'الاسم (إنجليزي)'**
  String get nameEnglish;

  /// No description provided for @inventory.
  ///
  /// In ar, this message translates to:
  /// **'المخزون'**
  String get inventory;

  /// No description provided for @noInventoryItems.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد عناصر في المخزون.'**
  String get noInventoryItems;

  /// No description provided for @lowStock.
  ///
  /// In ar, this message translates to:
  /// **'مخزون منخفض'**
  String get lowStock;

  /// No description provided for @addItem.
  ///
  /// In ar, this message translates to:
  /// **'إضافة عنصر'**
  String get addItem;

  /// No description provided for @itemName.
  ///
  /// In ar, this message translates to:
  /// **'اسم العنصر'**
  String get itemName;

  /// No description provided for @quantity.
  ///
  /// In ar, this message translates to:
  /// **'الكمية'**
  String get quantity;

  /// No description provided for @unit.
  ///
  /// In ar, this message translates to:
  /// **'الوحدة'**
  String get unit;

  /// No description provided for @minimumStock.
  ///
  /// In ar, this message translates to:
  /// **'الحد الأدنى للمخزون'**
  String get minimumStock;

  /// No description provided for @costPerUnit.
  ///
  /// In ar, this message translates to:
  /// **'تكلفة الوحدة'**
  String get costPerUnit;

  /// No description provided for @supplier.
  ///
  /// In ar, this message translates to:
  /// **'المورد'**
  String get supplier;

  /// No description provided for @tables.
  ///
  /// In ar, this message translates to:
  /// **'الطاولات'**
  String get tables;

  /// No description provided for @noTables.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد طاولات مضافة.'**
  String get noTables;

  /// No description provided for @addTable.
  ///
  /// In ar, this message translates to:
  /// **'إضافة طاولة'**
  String get addTable;

  /// No description provided for @tableLabel.
  ///
  /// In ar, this message translates to:
  /// **'اسم الطاولة'**
  String get tableLabel;

  /// No description provided for @capacity.
  ///
  /// In ar, this message translates to:
  /// **'السعة'**
  String get capacity;

  /// No description provided for @tableAvailable.
  ///
  /// In ar, this message translates to:
  /// **'متاحة'**
  String get tableAvailable;

  /// No description provided for @tableOccupied.
  ///
  /// In ar, this message translates to:
  /// **'مشغولة'**
  String get tableOccupied;

  /// No description provided for @tableReserved.
  ///
  /// In ar, this message translates to:
  /// **'محجوزة'**
  String get tableReserved;

  /// No description provided for @tableMerged.
  ///
  /// In ar, this message translates to:
  /// **'مدموجة'**
  String get tableMerged;

  /// No description provided for @delivery.
  ///
  /// In ar, this message translates to:
  /// **'مناطق التوصيل'**
  String get delivery;

  /// No description provided for @noDeliveryZones.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد مناطق توصيل مضافة.'**
  String get noDeliveryZones;

  /// No description provided for @addZone.
  ///
  /// In ar, this message translates to:
  /// **'إضافة منطقة'**
  String get addZone;

  /// No description provided for @zoneNameAr.
  ///
  /// In ar, this message translates to:
  /// **'اسم المنطقة (عربي)'**
  String get zoneNameAr;

  /// No description provided for @zoneNameEn.
  ///
  /// In ar, this message translates to:
  /// **'اسم المنطقة (إنجليزي)'**
  String get zoneNameEn;

  /// No description provided for @minOrder.
  ///
  /// In ar, this message translates to:
  /// **'الحد الأدنى للطلب'**
  String get minOrder;

  /// No description provided for @estimatedTimeMin.
  ///
  /// In ar, this message translates to:
  /// **'الوقت المتوقع (بالدقائق)'**
  String get estimatedTimeMin;

  /// No description provided for @minutesShort.
  ///
  /// In ar, this message translates to:
  /// **'دقيقة'**
  String get minutesShort;

  /// No description provided for @promotions.
  ///
  /// In ar, this message translates to:
  /// **'العروض والخصومات'**
  String get promotions;

  /// No description provided for @noPromotions.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد عروض مضافة.'**
  String get noPromotions;

  /// No description provided for @addPromotion.
  ///
  /// In ar, this message translates to:
  /// **'إضافة عرض'**
  String get addPromotion;

  /// No description provided for @discountType.
  ///
  /// In ar, this message translates to:
  /// **'نوع الخصم'**
  String get discountType;

  /// No description provided for @discountValue.
  ///
  /// In ar, this message translates to:
  /// **'قيمة الخصم'**
  String get discountValue;

  /// No description provided for @fixedAmount.
  ///
  /// In ar, this message translates to:
  /// **'مبلغ ثابت'**
  String get fixedAmount;

  /// No description provided for @percentage.
  ///
  /// In ar, this message translates to:
  /// **'نسبة مئوية'**
  String get percentage;

  /// No description provided for @freeShipping.
  ///
  /// In ar, this message translates to:
  /// **'توصيل مجاني'**
  String get freeShipping;

  /// No description provided for @expired.
  ///
  /// In ar, this message translates to:
  /// **'منتهي'**
  String get expired;

  /// No description provided for @hr.
  ///
  /// In ar, this message translates to:
  /// **'الموارد البشرية'**
  String get hr;

  /// No description provided for @employees.
  ///
  /// In ar, this message translates to:
  /// **'الموظفين'**
  String get employees;

  /// No description provided for @attendance.
  ///
  /// In ar, this message translates to:
  /// **'الحضور'**
  String get attendance;

  /// No description provided for @noEmployees.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد موظفين.'**
  String get noEmployees;

  /// No description provided for @noAttendanceToday.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد سجلات حضور اليوم.'**
  String get noAttendanceToday;

  /// No description provided for @present.
  ///
  /// In ar, this message translates to:
  /// **'حاضر'**
  String get present;

  /// No description provided for @late.
  ///
  /// In ar, this message translates to:
  /// **'متأخر'**
  String get late;

  /// No description provided for @absent.
  ///
  /// In ar, this message translates to:
  /// **'غائب'**
  String get absent;

  /// No description provided for @earlyLeave.
  ///
  /// In ar, this message translates to:
  /// **'انصراف مبكر'**
  String get earlyLeave;

  /// No description provided for @checkIn.
  ///
  /// In ar, this message translates to:
  /// **'حضور'**
  String get checkIn;

  /// No description provided for @checkOut.
  ///
  /// In ar, this message translates to:
  /// **'انصراف'**
  String get checkOut;

  /// No description provided for @hoursShort.
  ///
  /// In ar, this message translates to:
  /// **'ساعة'**
  String get hoursShort;

  /// No description provided for @noCustomers.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد عملاء.'**
  String get noCustomers;

  /// No description provided for @addCustomer.
  ///
  /// In ar, this message translates to:
  /// **'إضافة عميل'**
  String get addCustomer;

  /// No description provided for @quickActions.
  ///
  /// In ar, this message translates to:
  /// **'الوصول السريع'**
  String get quickActions;

  /// No description provided for @welcomeBack.
  ///
  /// In ar, this message translates to:
  /// **'أهلاً بعودتك'**
  String get welcomeBack;

  /// No description provided for @noProducts.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد منتجات في القائمة.'**
  String get noProducts;

  /// No description provided for @addProduct.
  ///
  /// In ar, this message translates to:
  /// **'إضافة منتج'**
  String get addProduct;

  /// No description provided for @category.
  ///
  /// In ar, this message translates to:
  /// **'القسم'**
  String get category;

  /// No description provided for @allCategories.
  ///
  /// In ar, this message translates to:
  /// **'الكل'**
  String get allCategories;

  /// No description provided for @manageCategories.
  ///
  /// In ar, this message translates to:
  /// **'إدارة الأقسام'**
  String get manageCategories;

  /// No description provided for @addCategory.
  ///
  /// In ar, this message translates to:
  /// **'إضافة قسم'**
  String get addCategory;

  /// No description provided for @sizesAndPrices.
  ///
  /// In ar, this message translates to:
  /// **'الأحجام والأسعار'**
  String get sizesAndPrices;

  /// No description provided for @addSize.
  ///
  /// In ar, this message translates to:
  /// **'إضافة حجم'**
  String get addSize;

  /// No description provided for @sizeLabel.
  ///
  /// In ar, this message translates to:
  /// **'اسم الحجم'**
  String get sizeLabel;

  /// No description provided for @oldPrice.
  ///
  /// In ar, this message translates to:
  /// **'السعر قبل الخصم'**
  String get oldPrice;

  /// No description provided for @popular.
  ///
  /// In ar, this message translates to:
  /// **'مميز'**
  String get popular;

  /// No description provided for @spicy.
  ///
  /// In ar, this message translates to:
  /// **'حار'**
  String get spicy;

  /// No description provided for @available.
  ///
  /// In ar, this message translates to:
  /// **'متاح'**
  String get available;

  /// No description provided for @outOfStock.
  ///
  /// In ar, this message translates to:
  /// **'غير متاح'**
  String get outOfStock;

  /// No description provided for @uploadImage.
  ///
  /// In ar, this message translates to:
  /// **'رفع صورة'**
  String get uploadImage;

  /// No description provided for @uploadingImage.
  ///
  /// In ar, this message translates to:
  /// **'جاري الرفع...'**
  String get uploadingImage;

  /// No description provided for @priceFrom.
  ///
  /// In ar, this message translates to:
  /// **'يبدأ من'**
  String get priceFrom;

  /// No description provided for @price.
  ///
  /// In ar, this message translates to:
  /// **'السعر'**
  String get price;

  /// No description provided for @currentOrder.
  ///
  /// In ar, this message translates to:
  /// **'الطلب الحالي'**
  String get currentOrder;

  /// No description provided for @cartEmpty.
  ///
  /// In ar, this message translates to:
  /// **'السلة فارغة'**
  String get cartEmpty;

  /// No description provided for @clearCart.
  ///
  /// In ar, this message translates to:
  /// **'تفريغ السلة'**
  String get clearCart;

  /// No description provided for @checkout.
  ///
  /// In ar, this message translates to:
  /// **'إتمام الطلب'**
  String get checkout;

  /// No description provided for @chooseSize.
  ///
  /// In ar, this message translates to:
  /// **'اختر الحجم'**
  String get chooseSize;

  /// No description provided for @orderTypeLabel.
  ///
  /// In ar, this message translates to:
  /// **'نوع الطلب'**
  String get orderTypeLabel;

  /// No description provided for @dineIn.
  ///
  /// In ar, this message translates to:
  /// **'صالة'**
  String get dineIn;

  /// No description provided for @takeaway.
  ///
  /// In ar, this message translates to:
  /// **'تيك أواي'**
  String get takeaway;

  /// No description provided for @deliveryOrder.
  ///
  /// In ar, this message translates to:
  /// **'دليفري'**
  String get deliveryOrder;

  /// No description provided for @deposit.
  ///
  /// In ar, this message translates to:
  /// **'عربون'**
  String get deposit;

  /// No description provided for @depositAmount.
  ///
  /// In ar, this message translates to:
  /// **'قيمة العربون'**
  String get depositAmount;

  /// No description provided for @customerInfo.
  ///
  /// In ar, this message translates to:
  /// **'بيانات العميل'**
  String get customerInfo;

  /// No description provided for @orderPlaced.
  ///
  /// In ar, this message translates to:
  /// **'تم إنشاء الطلب بنجاح!'**
  String get orderPlaced;

  /// No description provided for @itemsLabel.
  ///
  /// In ar, this message translates to:
  /// **'الأصناف'**
  String get itemsLabel;

  /// No description provided for @viewCart.
  ///
  /// In ar, this message translates to:
  /// **'عرض السلة'**
  String get viewCart;

  /// No description provided for @paymentMethod.
  ///
  /// In ar, this message translates to:
  /// **'طريقة الدفع'**
  String get paymentMethod;

  /// No description provided for @rangeToday.
  ///
  /// In ar, this message translates to:
  /// **'اليوم'**
  String get rangeToday;

  /// No description provided for @range7d.
  ///
  /// In ar, this message translates to:
  /// **'آخر 7 أيام'**
  String get range7d;

  /// No description provided for @range30d.
  ///
  /// In ar, this message translates to:
  /// **'آخر 30 يوماً'**
  String get range30d;

  /// No description provided for @revenue.
  ///
  /// In ar, this message translates to:
  /// **'الإيرادات'**
  String get revenue;

  /// No description provided for @totalOrders.
  ///
  /// In ar, this message translates to:
  /// **'الطلبات'**
  String get totalOrders;

  /// No description provided for @avgOrderValue.
  ///
  /// In ar, this message translates to:
  /// **'متوسط الطلب'**
  String get avgOrderValue;

  /// No description provided for @cancelledOrders.
  ///
  /// In ar, this message translates to:
  /// **'الملغاة'**
  String get cancelledOrders;

  /// No description provided for @revenueTrend.
  ///
  /// In ar, this message translates to:
  /// **'منحنى الإيرادات'**
  String get revenueTrend;

  /// No description provided for @topProducts.
  ///
  /// In ar, this message translates to:
  /// **'الأكثر مبيعاً'**
  String get topProducts;

  /// No description provided for @paymentBreakdown.
  ///
  /// In ar, this message translates to:
  /// **'طرق الدفع'**
  String get paymentBreakdown;

  /// No description provided for @orderTypeBreakdown.
  ///
  /// In ar, this message translates to:
  /// **'أنواع الطلبات'**
  String get orderTypeBreakdown;

  /// No description provided for @soldCount.
  ///
  /// In ar, this message translates to:
  /// **'مباع'**
  String get soldCount;

  /// No description provided for @allCaughtUp.
  ///
  /// In ar, this message translates to:
  /// **'كل شيء تمام! لا توجد طلبات نشطة.'**
  String get allCaughtUp;

  /// No description provided for @startPreparing.
  ///
  /// In ar, this message translates to:
  /// **'بدء التحضير'**
  String get startPreparing;

  /// No description provided for @markReady.
  ///
  /// In ar, this message translates to:
  /// **'جاهز للتسليم'**
  String get markReady;

  /// No description provided for @markCompleted.
  ///
  /// In ar, this message translates to:
  /// **'إنهاء الطلب'**
  String get markCompleted;

  /// No description provided for @callCustomer.
  ///
  /// In ar, this message translates to:
  /// **'اتصل بالعميل'**
  String get callCustomer;

  /// No description provided for @statusReady.
  ///
  /// In ar, this message translates to:
  /// **'جاهز'**
  String get statusReady;

  /// No description provided for @preferences.
  ///
  /// In ar, this message translates to:
  /// **'التفضيلات'**
  String get preferences;

  /// No description provided for @account.
  ///
  /// In ar, this message translates to:
  /// **'الحساب'**
  String get account;

  /// No description provided for @aboutApp.
  ///
  /// In ar, this message translates to:
  /// **'عن التطبيق'**
  String get aboutApp;

  /// No description provided for @logoutConfirm.
  ///
  /// In ar, this message translates to:
  /// **'هل أنت متأكد من تسجيل الخروج؟'**
  String get logoutConfirm;

  /// No description provided for @version.
  ///
  /// In ar, this message translates to:
  /// **'الإصدار'**
  String get version;

  /// No description provided for @sortItems.
  ///
  /// In ar, this message translates to:
  /// **'ترتيب الأصناف'**
  String get sortItems;

  /// No description provided for @dragToReorder.
  ///
  /// In ar, this message translates to:
  /// **'اسحب الأصناف لإعادة ترتيبها ثم احفظ.'**
  String get dragToReorder;

  /// No description provided for @emoji.
  ///
  /// In ar, this message translates to:
  /// **'الرمز التعبيري'**
  String get emoji;

  /// No description provided for @recentOrders.
  ///
  /// In ar, this message translates to:
  /// **'أحدث الطلبات'**
  String get recentOrders;

  /// No description provided for @todayAtGlance.
  ///
  /// In ar, this message translates to:
  /// **'ملخص اليوم'**
  String get todayAtGlance;

  /// No description provided for @qrTitle.
  ///
  /// In ar, this message translates to:
  /// **'رمز QR'**
  String get qrTitle;

  /// No description provided for @menuQr.
  ///
  /// In ar, this message translates to:
  /// **'QR القائمة'**
  String get menuQr;

  /// No description provided for @tableQr.
  ///
  /// In ar, this message translates to:
  /// **'QR الطاولة'**
  String get tableQr;

  /// No description provided for @wholeMenu.
  ///
  /// In ar, this message translates to:
  /// **'القائمة كاملة'**
  String get wholeMenu;

  /// No description provided for @scanToOrder.
  ///
  /// In ar, this message translates to:
  /// **'امسح الرمز لعرض القائمة والطلب'**
  String get scanToOrder;

  /// No description provided for @copyLink.
  ///
  /// In ar, this message translates to:
  /// **'نسخ الرابط'**
  String get copyLink;

  /// No description provided for @linkCopied.
  ///
  /// In ar, this message translates to:
  /// **'تم نسخ الرابط'**
  String get linkCopied;

  /// No description provided for @openMenu.
  ///
  /// In ar, this message translates to:
  /// **'فتح القائمة'**
  String get openMenu;

  /// No description provided for @selectTable.
  ///
  /// In ar, this message translates to:
  /// **'اختر الطاولة'**
  String get selectTable;

  /// No description provided for @recipes.
  ///
  /// In ar, this message translates to:
  /// **'الوصفات'**
  String get recipes;

  /// No description provided for @noRecipes.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد وصفات.'**
  String get noRecipes;

  /// No description provided for @addRecipe.
  ///
  /// In ar, this message translates to:
  /// **'إضافة وصفة'**
  String get addRecipe;

  /// No description provided for @productName.
  ///
  /// In ar, this message translates to:
  /// **'اسم المنتج'**
  String get productName;

  /// No description provided for @productCost.
  ///
  /// In ar, this message translates to:
  /// **'تكلفة المنتج'**
  String get productCost;

  /// No description provided for @ingredients.
  ///
  /// In ar, this message translates to:
  /// **'المكونات'**
  String get ingredients;

  /// No description provided for @addIngredient.
  ///
  /// In ar, this message translates to:
  /// **'إضافة مكوّن'**
  String get addIngredient;

  /// No description provided for @ingredient.
  ///
  /// In ar, this message translates to:
  /// **'المكوّن'**
  String get ingredient;

  /// No description provided for @noIngredients.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد مكونات بعد.'**
  String get noIngredients;
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
