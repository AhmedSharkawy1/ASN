import 'package:asn_app/core/error/exceptions.dart';
import 'package:asn_app/core/error/failures.dart';
import 'package:asn_app/core/logging/logger.dart';

class ErrorHandler {
  ErrorHandler._();

  static Failure handleException(Object exception, [StackTrace? stackTrace]) {
    AppLogger.error(
      'Exception caught in ErrorHandler',
      error: exception,
      stackTrace: stackTrace,
      name: 'ErrorHandler',
    );

    if (exception is ServerException) {
      return Failure.server(exception.message);
    } else if (exception is CacheException) {
      return Failure.cache(exception.message);
    } else if (exception is NetworkException) {
      return Failure.network(exception.message);
    } else if (exception is AuthException) {
      return Failure.auth(exception.message);
    } else if (exception is PermissionException) {
      return Failure.permission(exception.message);
    } else {
      return Failure.server(exception.toString());
    }
  }

  static String getMessage(Failure failure, {required String language}) {
    final isAr = language == 'ar';
    return failure.when(
      server: (msg) => msg ?? (isAr ? 'حدث خطأ في الخادم' : 'A server error occurred'),
      cache: (msg) => msg ?? (isAr ? 'حدث خطأ في الذاكرة المؤقتة' : 'A cache error occurred'),
      network: (msg) => msg ?? (isAr ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection'),
      auth: (msg) => msg ?? (isAr ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Invalid email or password'),
      permission: (msg) => msg ?? (isAr ? 'ليس لديك صلاحية للوصول' : 'You do not have access permission'),
    );
  }
}
