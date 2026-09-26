import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';

class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key});

  static const String contactPhone = '01092621367';
  static const String formattedPhone = '010 9262 1367';
  static const String internationalPhone = '+201092621367';

  Future<void> _launchWhatsApp(BuildContext context, bool isAr) async {
    final message = isAr
        ? 'مرحباً، أحتاج إلى مساعدة في إعادة تعيين كلمة المرور لحسابي في تطبيق ASN.'
        : 'Hello, I need assistance resetting my password for my ASN app account.';

    final whatsappUrl = Uri.parse(
      'https://wa.me/201092621367?text=${Uri.encodeComponent(message)}',
    );

    try {
      if (await canLaunchUrl(whatsappUrl)) {
        await launchUrl(whatsappUrl, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(whatsappUrl);
      }
    } catch (e) {
      if (context.mounted) {
        showAppSnackBar(
          context,
          isAr
              ? 'تعذر فتح واتساب تلقائياً، يمكنك التواصل يدوياً عبر الرقم $contactPhone'
              : 'Could not open WhatsApp automatically. Please contact $contactPhone',
          type: AppSnackBarType.error,
        );
      }
    }
  }

  Future<void> _callPhone(BuildContext context, bool isAr) async {
    final telUri = Uri.parse('tel:$contactPhone');
    try {
      if (await canLaunchUrl(telUri)) {
        await launchUrl(telUri);
      } else {
        if (!context.mounted) return;
        await _copyPhone(context, isAr);
      }
    } catch (_) {
      if (context.mounted) {
        await _copyPhone(context, isAr);
      }
    }
  }

  Future<void> _copyPhone(BuildContext context, bool isAr) async {
    await Clipboard.setData(const ClipboardData(text: contactPhone));
    if (context.mounted) {
      showAppSnackBar(
        context,
        isAr ? 'تم نسخ الرقم بنجاح: $contactPhone' : 'Phone copied: $contactPhone',
        type: AppSnackBarType.success,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isAr = Localizations.localeOf(context).languageCode == 'ar';

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            isAr ? Icons.arrow_forward_ios_rounded : Icons.arrow_back_ios_rounded,
            size: 20,
          ),
          onPressed: () => context.pop(),
          tooltip: isAr ? 'رجوع' : 'Back',
        ),
      ),
      body: Stack(
        children: [
          // Background ambient glows
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.oceanBlue.withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            bottom: -80,
            left: -80,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF25D366).withValues(alpha: 0.06),
              ),
            ),
          ),

          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Centered Proportional Logo Emblem
                    Center(
                      child: Container(
                        width: 108,
                        height: 108,
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

                    // Product title
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

                    // Headline
                    Text(
                      isAr ? 'تواصل معنا لإعادة تعيين كلمة المرور' : 'Contact Us to Reset Password',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                            height: 1.3,
                          ),
                    ),
                    AppSpacing.heightSm,

                    // Subtitle / explanatory text
                    Text(
                      isAr
                          ? 'إذا نسيت كلمة المرور الخاصة بحسابك، يرجى التواصل مع فريق الإدارة والدعم الفني ليتم التحقق من بياناتك وإعادة تعيين كلمة المرور فوراً.'
                          : 'If you forgot your password, please reach out to our support team to verify your identity and reset your account password immediately.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            height: 1.5,
                          ),
                    ),
                    AppSpacing.heightXl,

                    // Main Contact Card
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkCard : Colors.white,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                        border: Border.all(
                          color: isDark
                              ? AppColors.darkBorder
                              : AppColors.lightBorder.withValues(alpha: 0.7),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.06),
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Phone Number Display Tile
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppColors.darkCardElevated
                                  : AppColors.mistBlue.withValues(alpha: 0.4),
                              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                              border: Border.all(
                                color: AppColors.oceanBlue.withValues(alpha: 0.15),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: AppColors.oceanBlue.withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.phone_in_talk_rounded,
                                    color: AppColors.oceanBlue,
                                    size: 22,
                                  ),
                                ),
                                AppSpacing.widthMd,
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        isAr ? 'رقم الهاتف والدعم' : 'Support Phone Number',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: isDark
                                              ? AppColors.darkTextSecondary
                                              : AppColors.lightTextSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      const Text(
                                        formattedPhone,
                                        textDirection: TextDirection.ltr,
                                        style: TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 1.2,
                                          color: AppColors.oceanBlue,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.copy_rounded, size: 20),
                                  tooltip: isAr ? 'نسخ الرقم' : 'Copy Number',
                                  color: AppColors.oceanBlue,
                                  onPressed: () => _copyPhone(context, isAr),
                                ),
                              ],
                            ),
                          ),
                          AppSpacing.heightLg,

                          // WhatsApp Primary Action Button
                          SizedBox(
                            height: 52,
                            child: ElevatedButton(
                              onPressed: () => _launchWhatsApp(context, isAr),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF25D366),
                                foregroundColor: Colors.white,
                                elevation: 2,
                                shadowColor: const Color(0xFF25D366).withValues(alpha: 0.4),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  // Styled WhatsApp Icon badge
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.chat_bubble_rounded,
                                      color: Color(0xFF25D366),
                                      size: 16,
                                    ),
                                  ),
                                  AppSpacing.widthMd,
                                  Text(
                                    isAr ? 'تواصل معنا عبر واتساب' : 'Chat on WhatsApp',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          AppSpacing.heightMd,

                          // Direct Call Button
                          SizedBox(
                            height: 48,
                            child: OutlinedButton.icon(
                              onPressed: () => _callPhone(context, isAr),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.oceanBlue,
                                side: BorderSide(
                                  color: AppColors.oceanBlue.withValues(alpha: 0.4),
                                  width: 1.5,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                                ),
                              ),
                              icon: const Icon(Icons.call_outlined, size: 20),
                              label: Text(
                                isAr ? 'اتصال هاتفي مباشر' : 'Call Phone Directly',
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    AppSpacing.heightXl,

                    // Back to Login Button
                    TextButton.icon(
                      onPressed: () => context.pop(),
                      style: TextButton.styleFrom(
                        foregroundColor: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                      ),
                      icon: Icon(
                        isAr ? Icons.arrow_forward_rounded : Icons.arrow_back_rounded,
                        size: 18,
                      ),
                      label: Text(
                        isAr ? 'العودة إلى شاشة تسجيل الدخول' : 'Back to Sign In',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
