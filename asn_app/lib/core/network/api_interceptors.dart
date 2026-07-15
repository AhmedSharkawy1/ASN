import 'package:dio/dio.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/storage/secure_storage.dart';

class AuthInterceptor extends Interceptor {
  final SecureStorage _secureStorage;

  AuthInterceptor(this._secureStorage);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _secureStorage.getAuthToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    // Set default headers
    options.headers['Accept'] = 'application/json';
    options.headers['Content-Type'] = 'application/json';
    
    super.onRequest(options, handler);
  }
}

class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    AppLogger.debug('--> ${options.method} ${options.uri}', name: 'API');
    AppLogger.debug('Headers: ${options.headers}', name: 'API');
    if (options.data != null) {
      AppLogger.debug('Body: ${options.data}', name: 'API');
    }
    super.onRequest(options, handler);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    AppLogger.debug('<-- ${response.statusCode} ${response.requestOptions.method} ${response.requestOptions.uri}', name: 'API');
    AppLogger.debug('Response: ${response.data}', name: 'API');
    super.onResponse(response, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    AppLogger.error(
      'API Error: ${err.message}',
      name: 'API',
      error: err.error,
      stackTrace: err.stackTrace,
    );
    super.onError(err, handler);
  }
}

class RetryInterceptor extends Interceptor {
  final Dio _dio;
  final int maxRetries;
  final Duration retryInterval;

  RetryInterceptor(
    this._dio, {
    this.maxRetries = 3,
    this.retryInterval = const Duration(seconds: 2),
  });

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final options = err.requestOptions;
    
    // Check if the error is retryable
    final isRetryable = err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        (err.response?.statusCode != null && err.response!.statusCode! >= 500);

    // Get current retry count
    var retryCount = options.extra['retry_count'] as int? ?? 0;

    if (isRetryable && retryCount < maxRetries) {
      retryCount++;
      options.extra['retry_count'] = retryCount;

      AppLogger.warning(
        'Retrying request ${options.method} ${options.uri} ($retryCount/$maxRetries) in ${retryInterval.inSeconds}s...',
        name: 'API',
      );

      await Future<void>.delayed(retryInterval * retryCount); // Exponential backoff basic

      try {
        final response = await _dio.fetch<dynamic>(options);
        return handler.resolve(response);
      } on DioException catch (retryErr) {
        return super.onError(retryErr, handler);
      }
    }

    super.onError(err, handler);
  }
}
