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

  /// Receives errors/warnings even in production so crashes stay visible.
  /// Wired to the on-device error store in bootstrap.
  static void Function(
    String message, {
    String? name,
    Object? error,
    StackTrace? stackTrace,
  })? onError;

  static void log(
    String message, {
    LogLevel level = LogLevel.info,
    String? name,
    Object? error,
    StackTrace? stackTrace,
  }) {
    // Errors are always recorded — silencing them in production is what makes
    // field failures impossible to diagnose.
    if (level == LogLevel.error) {
      onError?.call(message, name: name, error: error, stackTrace: stackTrace);
    }

    if (AppConfig.isProduction) {
      // Never write verbose logs to logcat in a shipped build: they can carry
      // customer phone numbers, order details and token fragments.
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
