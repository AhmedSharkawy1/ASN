// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'ASN Restaurant';

  @override
  String get loginTitle => 'Sign In';

  @override
  String get loginSubtitle => 'Enter your credentials to access your account';

  @override
  String get usernameOrEmail => 'Email or Username';

  @override
  String get password => 'Password';

  @override
  String get forgotPassword => 'Forgot Password?';

  @override
  String get signInButton => 'Sign In';

  @override
  String get signingIn => 'Signing In...';

  @override
  String get offlineWarning =>
      'You are offline. Check your credentials or connect to the internet first.';

  @override
  String get dashboard => 'Dashboard';

  @override
  String get orders => 'Orders';

  @override
  String get pos => 'Point of Sale (POS)';

  @override
  String get kitchen => 'Kitchen Screen';

  @override
  String get products => 'Products';

  @override
  String get categories => 'Categories';

  @override
  String get customers => 'Customers';

  @override
  String get reports => 'Reports';

  @override
  String get settings => 'Settings';

  @override
  String get logout => 'Logout';

  @override
  String get themeMode => 'Theme Mode';

  @override
  String get language => 'Language';

  @override
  String get arabic => 'Arabic';

  @override
  String get english => 'English';

  @override
  String get light => 'Light';

  @override
  String get dark => 'Dark';

  @override
  String get system => 'System';

  @override
  String get noOrders => 'No orders available';

  @override
  String get newOrderAlert => '🛍️ New Order!';

  @override
  String orderNumber(Object number) {
    return 'Order #$number';
  }

  @override
  String get total => 'Total';

  @override
  String get subtotal => 'Subtotal';

  @override
  String get discount => 'Discount';

  @override
  String get deliveryFee => 'Delivery Fee';

  @override
  String get statusPending => 'Pending';

  @override
  String get statusInProgress => 'In Progress';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusCancelled => 'Cancelled';

  @override
  String get paymentCash => 'Cash';

  @override
  String get paymentCard => 'Card';

  @override
  String get customerName => 'Name';

  @override
  String get customerPhone => 'Phone';

  @override
  String get customerAddress => 'Address';

  @override
  String get syncAndRefresh => 'Sync & Refresh';

  @override
  String get offlineMode => 'Offline Mode';

  @override
  String get retryButton => 'Retry';

  @override
  String get errorOccurred => 'An unexpected error occurred';

  @override
  String get sessionExpired => 'Session expired. Please login again.';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get edit => 'Edit';

  @override
  String get delete => 'Delete';

  @override
  String get deleteConfirmTitle => 'Delete this item?';

  @override
  String get fieldRequired => 'This field is required';

  @override
  String get searchHint => 'Search...';

  @override
  String get notes => 'Notes';

  @override
  String get active => 'Active';

  @override
  String get inactive => 'Inactive';

  @override
  String get startDate => 'Start Date';

  @override
  String get endDate => 'End Date';

  @override
  String get description => 'Description';

  @override
  String get nameArabic => 'Name (Arabic)';

  @override
  String get nameEnglish => 'Name (English)';

  @override
  String get inventory => 'Inventory';

  @override
  String get noInventoryItems => 'No inventory items found.';

  @override
  String get lowStock => 'Low Stock';

  @override
  String get addItem => 'Add Item';

  @override
  String get itemName => 'Item Name';

  @override
  String get quantity => 'Quantity';

  @override
  String get unit => 'Unit';

  @override
  String get minimumStock => 'Minimum Stock';

  @override
  String get costPerUnit => 'Cost per Unit';

  @override
  String get supplier => 'Supplier';

  @override
  String get tables => 'Tables';

  @override
  String get noTables => 'No tables added yet.';

  @override
  String get addTable => 'Add Table';

  @override
  String get tableLabel => 'Table Label';

  @override
  String get capacity => 'Capacity';

  @override
  String get tableAvailable => 'Available';

  @override
  String get tableOccupied => 'Occupied';

  @override
  String get tableReserved => 'Reserved';

  @override
  String get tableMerged => 'Merged';

  @override
  String get delivery => 'Delivery Zones';

  @override
  String get noDeliveryZones => 'No delivery zones added yet.';

  @override
  String get addZone => 'Add Zone';

  @override
  String get zoneNameAr => 'Zone Name (Arabic)';

  @override
  String get zoneNameEn => 'Zone Name (English)';

  @override
  String get minOrder => 'Min Order';

  @override
  String get estimatedTimeMin => 'Estimated Time (minutes)';

  @override
  String get minutesShort => 'min';

  @override
  String get promotions => 'Promotions';

  @override
  String get noPromotions => 'No promotions added yet.';

  @override
  String get addPromotion => 'Add Promotion';

  @override
  String get discountType => 'Discount Type';

  @override
  String get discountValue => 'Discount Value';

  @override
  String get fixedAmount => 'Fixed Amount';

  @override
  String get percentage => 'Percentage';

  @override
  String get freeShipping => 'Free Delivery';

  @override
  String get expired => 'Expired';

  @override
  String get hr => 'Human Resources';

  @override
  String get employees => 'Employees';

  @override
  String get attendance => 'Attendance';

  @override
  String get noEmployees => 'No employees found.';

  @override
  String get noAttendanceToday => 'No attendance records for today.';

  @override
  String get present => 'Present';

  @override
  String get late => 'Late';

  @override
  String get absent => 'Absent';

  @override
  String get earlyLeave => 'Early Leave';

  @override
  String get checkIn => 'In';

  @override
  String get checkOut => 'Out';

  @override
  String get hoursShort => 'hrs';

  @override
  String get noCustomers => 'No customers found.';

  @override
  String get addCustomer => 'Add Customer';

  @override
  String get quickActions => 'Quick Actions';

  @override
  String get welcomeBack => 'Welcome back';

  @override
  String get noProducts => 'No products found in your menu.';

  @override
  String get addProduct => 'Add Product';

  @override
  String get category => 'Category';

  @override
  String get allCategories => 'All';

  @override
  String get manageCategories => 'Manage Categories';

  @override
  String get addCategory => 'Add Category';

  @override
  String get sizesAndPrices => 'Sizes & Prices';

  @override
  String get addSize => 'Add Size';

  @override
  String get sizeLabel => 'Size Label';

  @override
  String get oldPrice => 'Old Price';

  @override
  String get popular => 'Popular';

  @override
  String get spicy => 'Spicy';

  @override
  String get available => 'Available';

  @override
  String get outOfStock => 'Out of Stock';

  @override
  String get uploadImage => 'Upload Image';

  @override
  String get uploadingImage => 'Uploading...';

  @override
  String get priceFrom => 'From';

  @override
  String get price => 'Price';

  @override
  String get currentOrder => 'Current Order';

  @override
  String get cartEmpty => 'Cart is empty';

  @override
  String get clearCart => 'Clear Cart';

  @override
  String get checkout => 'Checkout';

  @override
  String get chooseSize => 'Choose Size';

  @override
  String get orderTypeLabel => 'Order Type';

  @override
  String get dineIn => 'Dine-in';

  @override
  String get takeaway => 'Takeaway';

  @override
  String get deliveryOrder => 'Delivery';

  @override
  String get deposit => 'Deposit';

  @override
  String get depositAmount => 'Deposit Amount';

  @override
  String get customerInfo => 'Customer Info';

  @override
  String get orderPlaced => 'Order placed successfully!';

  @override
  String get itemsLabel => 'Items';

  @override
  String get viewCart => 'View Cart';

  @override
  String get paymentMethod => 'Payment Method';

  @override
  String get rangeToday => 'Today';

  @override
  String get range7d => 'Last 7 Days';

  @override
  String get range30d => 'Last 30 Days';

  @override
  String get revenue => 'Revenue';

  @override
  String get totalOrders => 'Orders';

  @override
  String get avgOrderValue => 'Avg Order';

  @override
  String get cancelledOrders => 'Cancelled';

  @override
  String get revenueTrend => 'Revenue Trend';

  @override
  String get topProducts => 'Top Products';

  @override
  String get paymentBreakdown => 'Payment Methods';

  @override
  String get orderTypeBreakdown => 'Order Types';

  @override
  String get soldCount => 'sold';

  @override
  String get allCaughtUp => 'All caught up! No active orders.';

  @override
  String get startPreparing => 'Start Preparing';

  @override
  String get markReady => 'Mark Ready';

  @override
  String get markCompleted => 'Complete Order';

  @override
  String get callCustomer => 'Call Customer';

  @override
  String get statusReady => 'Ready';

  @override
  String get preferences => 'Preferences';

  @override
  String get account => 'Account';

  @override
  String get aboutApp => 'About App';

  @override
  String get logoutConfirm => 'Are you sure you want to log out?';

  @override
  String get version => 'Version';

  @override
  String get sortItems => 'Sort Items';

  @override
  String get dragToReorder => 'Drag items to reorder, then save.';

  @override
  String get emoji => 'Emoji';

  @override
  String get recentOrders => 'Recent Orders';

  @override
  String get todayAtGlance => 'Today at a Glance';

  @override
  String get qrTitle => 'QR Code';

  @override
  String get menuQr => 'Menu QR';

  @override
  String get tableQr => 'Table QR';

  @override
  String get wholeMenu => 'Whole Menu';

  @override
  String get scanToOrder => 'Scan to view the menu and order';

  @override
  String get copyLink => 'Copy Link';

  @override
  String get linkCopied => 'Link copied';

  @override
  String get openMenu => 'Open Menu';

  @override
  String get selectTable => 'Select Table';

  @override
  String get recipes => 'Recipes';

  @override
  String get noRecipes => 'No recipes found.';

  @override
  String get addRecipe => 'Add Recipe';

  @override
  String get productName => 'Product Name';

  @override
  String get productCost => 'Product Cost';

  @override
  String get ingredients => 'Ingredients';

  @override
  String get addIngredient => 'Add Ingredient';

  @override
  String get ingredient => 'Ingredient';

  @override
  String get noIngredients => 'No ingredients yet.';
}
