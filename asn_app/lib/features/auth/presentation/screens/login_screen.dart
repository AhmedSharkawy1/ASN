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

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  
  bool _obscurePassword = true;
  bool _rememberMe = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submitForm() {
    if (_formKey.currentState?.validate() ?? false) {
      final isAr = ref.read(localeProvider).languageCode == 'ar';
      final lang = isAr ? 'ar' : 'en';

      ref.read(authNotifierProvider.notifier).login(
            _usernameController.text.trim(),
            _passwordController.text,
            lang,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isAr = Localizations.localeOf(context).languageCode == 'ar';
    final authState = ref.watch(authNotifierProvider);

    // Navigate to Dashboard when login succeeds
    ref.listen<AuthState>(authNotifierProvider, (previous, next) {
      next.maybeWhen(
        authenticated: (user) {
          context.go('/dashboard');
        },
        error: (message) {
          showAppSnackBar(context, message, type: AppSnackBarType.error);
        },
        orElse: () {},
      );
    });

    final isLoading = authState.maybeWhen(loading: () => true, orElse: () => false);

    return Scaffold(
      backgroundColor: Theme.of(context).brightness == Brightness.dark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: Stack(
        children: [
          // Background Aesthetic Glow
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.tealPrimary.withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.cyanAccent.withValues(alpha: 0.06),
              ),
            ),
          ),
          
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header Logo
                      Center(
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: AppColors.brandGradient,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.tealPrimary.withValues(alpha: 0.3),
                                blurRadius: 20,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.restaurant_menu,
                            size: 38,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      AppSpacing.heightLg,
                      
                      // Titles
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
                              color: Theme.of(context).brightness == Brightness.dark
                                  ? AppColors.darkTextSecondary
                                  : AppColors.lightTextSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                      ),
                      AppSpacing.heightXl,

                      // Username/Email Field
                      Text(
                        l10n.usernameOrEmail,
                        textAlign: isAr ? TextAlign.right : TextAlign.left,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      AppSpacing.heightXs,
                      TextFormField(
                        controller: _usernameController,
                        enabled: !isLoading,
                        keyboardType: TextInputType.emailAddress,
                        textDirection: TextDirection.ltr,
                        decoration: InputDecoration(
                          hintText: isAr ? 'admin@website.com أو admin1' : 'user@example.com or admin1',
                          prefixIcon: const Icon(Icons.mail_outline),
                          hintStyle: TextStyle(
                            color: Colors.grey.withValues(alpha: 0.5),
                          ),
                        ),
                        validator: (value) => Validators.validateUsernameOrEmail(
                          value,
                          emptyMessage: isAr ? 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني' : 'Please enter email or username',
                        ),
                      ),
                      AppSpacing.heightMd,

                      // Password Field
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            l10n.password,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          TextButton(
                            onPressed: isLoading ? null : () {},
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                            ),
                            child: Text(
                              l10n.forgotPassword,
                              style: const TextStyle(
                                color: AppColors.tealPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                      AppSpacing.heightXs,
                      TextFormField(
                        controller: _passwordController,
                        enabled: !isLoading,
                        obscureText: _obscurePassword,
                        textDirection: TextDirection.ltr,
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                        ),
                        validator: (value) => Validators.validatePassword(
                          value,
                          emptyMessage: isAr ? 'يرجى إدخال كلمة المرور' : 'Please enter password',
                          shortMessage: isAr ? 'كلمة المرور قصيرة جداً (أقل من 6 أحرف)' : 'Password is too short (min 6 chars)',
                        ),
                      ),
                      AppSpacing.heightMd,

                      // Remember Me / Language switch row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Remember me
                          Row(
                            children: [
                              Checkbox(
                                value: _rememberMe,
                                activeColor: AppColors.tealPrimary,
                                visualDensity: VisualDensity.compact,
                                onChanged: isLoading
                                    ? null
                                    : (val) {
                                        setState(() {
                                          _rememberMe = val ?? true;
                                        });
                                      },
                              ),
                              Text(
                                isAr ? 'تذكرني' : 'Remember Me',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                          
                          // Language Switcher
                          TextButton.icon(
                            onPressed: isLoading
                                ? null
                                : () {
                                    final notifier = ref.read(localeProvider.notifier);
                                    notifier.setLocale(
                                      isAr ? const Locale('en') : const Locale('ar'),
                                    );
                                  },
                            icon: const Icon(Icons.language, size: 16),
                            label: Text(
                              isAr ? 'English' : 'العربية',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.tealPrimary,
                            ),
                          ),
                        ],
                      ),
                      AppSpacing.heightLg,

                      // Submit Button
                      Container(
                        height: 52,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.tealPrimary.withValues(alpha: 0.2),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: isLoading ? null : _submitForm,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.tealPrimary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                            ),
                          ),
                          child: isLoading
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.0,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Text(
                                  l10n.signInButton,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                    ],
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
