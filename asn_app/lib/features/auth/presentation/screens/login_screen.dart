import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/core/utils/validators.dart';
import 'package:asn_app/core/localization/locale_provider.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _rememberMe = true;
  bool _isNavigatingToDashboard = false;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.94, end: 1.05).animate(
      CurvedAnimation(
        parent: _pulseController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submitForm() {
    final isAlreadyLoading = ref
        .read(authNotifierProvider)
        .maybeWhen(loading: () => true, orElse: () => false);
    if (isAlreadyLoading || _isNavigatingToDashboard) return;

    if (_formKey.currentState?.validate() ?? false) {
      final isAr = ref.read(localeProvider).languageCode == 'ar';
      final lang = isAr ? 'ar' : 'en';

      ref.read(authNotifierProvider.notifier).login(
            _usernameController.text.trim(),
            _passwordController.text,
            lang,
            rememberMe: _rememberMe,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isAr = Localizations.localeOf(context).languageCode == 'ar';
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authState = ref.watch(authNotifierProvider);

    // Listen to Auth State transitions
    ref.listen<AuthState>(authNotifierProvider, (previous, next) {
      next.maybeWhen(
        authenticated: (user) {
          setState(() {
            _isNavigatingToDashboard = true;
          });
          context.go('/dashboard');
        },
        error: (message) {
          setState(() {
            _isNavigatingToDashboard = false;
          });
          showAppSnackBar(context, message, type: AppSnackBarType.error);
        },
        orElse: () {},
      );
    });

    final isAuthLoading =
        authState.maybeWhen(loading: () => true, orElse: () => false);
    final showLoadingScreen = isAuthLoading || _isNavigatingToDashboard;

    return Scaffold(
      backgroundColor:
          isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: Stack(
        children: [
          // Background Aesthetic Glow Orbs
          Positioned(
            top: -90,
            left: -90,
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.oceanBlue.withValues(alpha: 0.09),
              ),
            ),
          ),
          Positioned(
            bottom: -70,
            right: -70,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.seaBlue.withValues(alpha: 0.07),
              ),
            ),
          ),

          // Main Content Form
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.xl,
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Enhanced Proportional Logo Emblem
                    Center(
                      child: Container(
                        width: 112,
                        height: 112,
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkCard : Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(
                            color: AppColors.oceanBlue.withValues(alpha: 0.16),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.oceanBlue.withValues(alpha: 0.14),
                              blurRadius: 24,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Image.asset(
                          'assets/logo.png',
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stack) => const Icon(
                            Icons.storefront_outlined,
                            size: 48,
                            color: AppColors.oceanBlue,
                          ),
                        ),
                      ),
                    ),
                    AppSpacing.heightMd,

                    // Platform Brand Title
                    Text(
                      'ASN Technology',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            letterSpacing: 2,
                            color: AppColors.oceanBlue,
                          ),
                    ),
                    AppSpacing.heightLg,

                    // Screen Headers
                    Text(
                      l10n.loginTitle,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                          ),
                    ),
                    AppSpacing.heightXs,
                    Text(
                      l10n.loginSubtitle,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: isDark
                                ? AppColors.darkTextSecondary
                                : AppColors.lightTextSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                    AppSpacing.heightXl,

                    // Login Card Container
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkCard : Colors.white,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                        border: Border.all(
                          color: isDark
                              ? AppColors.darkBorder
                              : AppColors.lightBorder.withValues(alpha: 0.7),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.05),
                            blurRadius: 24,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Username/Email Field
                            Text(
                              l10n.usernameOrEmail,
                              textAlign: isAr ? TextAlign.right : TextAlign.left,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            AppSpacing.heightXs,
                            TextFormField(
                              controller: _usernameController,
                              enabled: !showLoadingScreen,
                              keyboardType: TextInputType.emailAddress,
                              textCapitalization: TextCapitalization.none,
                              autocorrect: false,
                              textDirection: TextDirection.ltr,
                              decoration: InputDecoration(
                                hintText: isAr
                                    ? 'admin@website.com أو admin1'
                                    : 'user@example.com or admin1',
                                prefixIcon: const Icon(Icons.mail_outline_rounded),
                                filled: true,
                                fillColor: isDark
                                    ? AppColors.darkCardElevated
                                    : AppColors.lightBackground.withValues(alpha: 0.6),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.md,
                                  vertical: AppSpacing.md,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(AppSpacing.radiusMd),
                                  borderSide: BorderSide(
                                    color: isDark
                                        ? AppColors.darkBorder
                                        : AppColors.lightBorder,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(AppSpacing.radiusMd),
                                  borderSide: BorderSide(
                                    color: isDark
                                        ? AppColors.darkBorder
                                        : AppColors.lightBorder,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(AppSpacing.radiusMd),
                                  borderSide: const BorderSide(
                                    color: AppColors.oceanBlue,
                                    width: 1.8,
                                  ),
                                ),
                              ),
                              validator: (value) =>
                                  Validators.validateUsernameOrEmail(
                                value,
                                emptyMessage: isAr
                                    ? 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني'
                                    : 'Please enter email or username',
                              ),
                            ),
                            AppSpacing.heightLg,

                            // Password Header with Forgot Password Link
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  l10n.password,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleSmall
                                      ?.copyWith(fontWeight: FontWeight.bold),
                                ),
                                TextButton(
                                  onPressed: showLoadingScreen
                                      ? null
                                      : () {
                                          context.push('/forgot-password');
                                        },
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: Text(
                                    l10n.forgotPassword,
                                    style: const TextStyle(
                                      color: AppColors.oceanBlue,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            AppSpacing.heightXs,
                            TextFormField(
                              controller: _passwordController,
                              enabled: !showLoadingScreen,
                              obscureText: _obscurePassword,
                              textDirection: TextDirection.ltr,
                              decoration: InputDecoration(
                                hintText: '••••••••',
                                prefixIcon: const Icon(Icons.lock_outline_rounded),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                ),
                                filled: true,
                                fillColor: isDark
                                    ? AppColors.darkCardElevated
                                    : AppColors.lightBackground.withValues(alpha: 0.6),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.md,
                                  vertical: AppSpacing.md,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(AppSpacing.radiusMd),
                                  borderSide: BorderSide(
                                    color: isDark
                                        ? AppColors.darkBorder
                                        : AppColors.lightBorder,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(AppSpacing.radiusMd),
                                  borderSide: BorderSide(
                                    color: isDark
                                        ? AppColors.darkBorder
                                        : AppColors.lightBorder,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(AppSpacing.radiusMd),
                                  borderSide: const BorderSide(
                                    color: AppColors.oceanBlue,
                                    width: 1.8,
                                  ),
                                ),
                              ),
                              validator: (value) => Validators.validatePassword(
                                value,
                                emptyMessage: isAr
                                    ? 'يرجى إدخال كلمة المرور'
                                    : 'Please enter password',
                                shortMessage: isAr
                                    ? 'كلمة المرور قصيرة جداً (أقل من 6 أحرف)'
                                    : 'Password is too short (min 6 chars)',
                              ),
                            ),
                            AppSpacing.heightMd,

                            // Remember Me & Language switch row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                // Remember me toggle
                                InkWell(
                                  onTap: showLoadingScreen
                                      ? null
                                      : () {
                                          setState(() {
                                            _rememberMe = !_rememberMe;
                                          });
                                        },
                                  borderRadius: BorderRadius.circular(6),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 4.0, horizontal: 2.0),
                                    child: Row(
                                      children: [
                                        Checkbox(
                                          value: _rememberMe,
                                          activeColor: AppColors.oceanBlue,
                                          visualDensity: VisualDensity.compact,
                                          materialTapTargetSize:
                                              MaterialTapTargetSize.shrinkWrap,
                                          onChanged: showLoadingScreen
                                              ? null
                                              : (val) {
                                                  setState(() {
                                                    _rememberMe = val ?? true;
                                                  });
                                                },
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          isAr ? 'تذكرني' : 'Remember Me',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),

                                // Language Switcher Button
                                TextButton.icon(
                                  onPressed: showLoadingScreen
                                      ? null
                                      : () {
                                          final notifier =
                                              ref.read(localeProvider.notifier);
                                          notifier.setLocale(
                                            isAr
                                                ? const Locale('en')
                                                : const Locale('ar'),
                                          );
                                        },
                                  icon: const Icon(Icons.language_rounded,
                                      size: 16),
                                  label: Text(
                                    isAr ? 'English' : 'العربية',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                  style: TextButton.styleFrom(
                                    foregroundColor: AppColors.oceanBlue,
                                  ),
                                ),
                              ],
                            ),
                            AppSpacing.heightLg,

                            // Submit Button
                            SizedBox(
                              height: 54,
                              child: ElevatedButton(
                                onPressed:
                                    showLoadingScreen ? null : _submitForm,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.oceanBlue,
                                  foregroundColor: Colors.white,
                                  elevation: 2,
                                  shadowColor: AppColors.oceanBlue
                                      .withValues(alpha: 0.35),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(
                                        AppSpacing.radiusMd),
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      l10n.signInButton,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.2,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Icon(
                                      isAr
                                          ? Icons.arrow_back_rounded
                                          : Icons.arrow_forward_rounded,
                                      size: 18,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Dedicated Full-Page Loading Screen
          // Appears immediately upon submission and remains until the dashboard loads
          if (showLoadingScreen)
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Color(0xFF0B131D),
                      Color(0xFF14212D),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Center(
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Pulsing Logo Emblem
                          ScaleTransition(
                            scale: _pulseAnimation,
                            child: Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(30),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.oceanBlue
                                        .withValues(alpha: 0.45),
                                    blurRadius: 36,
                                    spreadRadius: 6,
                                  ),
                                ],
                              ),
                              padding: const EdgeInsets.all(AppSpacing.md),
                              child: Image.asset(
                                'assets/logo.png',
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stack) =>
                                    const Icon(
                                  Icons.storefront_outlined,
                                  size: 52,
                                  color: AppColors.oceanBlue,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 36),

                          // Modern Spinner
                          const SizedBox(
                            width: 44,
                            height: 44,
                            child: CircularProgressIndicator(
                              strokeWidth: 3.5,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                AppColors.seaBlue,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Heading
                          Text(
                            isAr ? 'جاري تسجيل الدخول...' : 'Signing In...',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Subtitle
                          Text(
                            isAr
                                ? 'يرجى الانتظار، جاري تحضير وفتح لوحة التحكم...'
                                : 'Please wait, loading your control panel...',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.78),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Progress / Status indicator badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.12),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: AppColors.seaBlue,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  isAr
                                      ? 'التحقق من البيانات والصلاحيات'
                                      : 'Verifying permissions & session',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.85),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
