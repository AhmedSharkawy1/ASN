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
}
