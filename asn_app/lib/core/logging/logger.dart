import 'dart:developer' as developer;
import 'package:asn_app/core/config/app_config.dart';

enum LogLevel {
  debug,
  info,
  warning,
  error,
}

class AppLogger {
  AppLogger._();

  static void log(
    String message, {
    LogLevel level = LogLevel.info,
    String? name,
    Object? error,
    StackTrace? stackTrace,
  }) {
    if (AppConfig.isProduction) {
      // In production, we don't log to standard out to avoid sensitive data leakage
      // You can integrate Crashlytics/Sentry here for Error logs
      return;
    }

    final levelStr = level.name.toUpperCase();
    final logName = name != null ? 'ASN.$name' : 'ASN';

    developer.log(
      '[$levelStr] $message',
      name: logName,
      error: error,
      stackTrace: stackTrace,
      time: DateTime.now(),
    );
  }

  static void debug(String message, {String? name}) {
    log(message, level: LogLevel.debug, name: name);
  }

  static void info(String message, {String? name}) {
    log(message, level: LogLevel.info, name: name);
  }

  static void warning(String message, {String? name}) {
    log(message, level: LogLevel.warning, name: name);
  }

  static void error(
    String message, {
    String? name,
    Object? error,
    StackTrace? stackTrace,
  }) {
    log(
      message,
      level: LogLevel.error,
      name: name,
      error: error,
      stackTrace: stackTrace,
    );
  }
}
