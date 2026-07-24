import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Records crashes and errors on the device so production failures are
/// diagnosable without shipping a third-party analytics SDK.
///
/// Kept deliberately small: a bounded ring buffer in SharedPreferences that
/// the in-app diagnostics screen can display or the user can share. Swap the
/// [_persist] body for Sentry/Crashlytics later without touching call sites.
class ErrorReporter {
  ErrorReporter._();

  static const String _key = 'app_error_log';
  static const int _maxEntries = 50;

  /// Message length cap — stack traces are long and this is device storage.
  static const int _maxMessageChars = 1200;

  static bool _installed = false;

  /// Routes uncaught framework/platform errors here. Call once at startup.
  static void install() {
    if (_installed) return;
    _installed = true;

    final previousOnError = FlutterError.onError;
    FlutterError.onError = (FlutterErrorDetails details) {
      record(
        details.exceptionAsString(),
        name: 'FlutterError',
        stackTrace: details.stack,
      );
      previousOnError?.call(details);
    };

    // Errors raised outside the framework (platform channels, isolates).
    PlatformDispatcher.instance.onError = (error, stack) {
      record('$error', name: 'PlatformDispatcher', stackTrace: stack);
      return false; // keep default handling
    };
  }

  static Future<void> record(
    String message, {
    String? name,
    Object? error,
    StackTrace? stackTrace,
  }) async {
    final buffer = StringBuffer()
      ..write(DateTime.now().toIso8601String())
      ..write(' [')
      ..write(name ?? 'app')
      ..write('] ')
      ..write(message);
    if (error != null) buffer.write('\n$error');
    if (stackTrace != null) {
      // First frames carry the useful signal.
      final frames = stackTrace.toString().split('\n').take(8).join('\n');
      buffer.write('\n$frames');
    }

    var entry = buffer.toString();
    if (entry.length > _maxMessageChars) {
      entry = '${entry.substring(0, _maxMessageChars)}…';
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final existing = prefs.getStringList(_key) ?? <String>[];
      existing.add(entry);
      // Keep only the most recent entries.
      final trimmed = existing.length > _maxEntries
          ? existing.sublist(existing.length - _maxEntries)
          : existing;
      await prefs.setStringList(_key, trimmed);
    } catch (_) {
      // Storage failure must never itself crash the app.
    }
  }

  static Future<List<String>> readAll() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return (prefs.getStringList(_key) ?? <String>[]).reversed.toList();
    } catch (_) {
      return const [];
    }
  }

  static Future<void> clear() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_key);
    } catch (_) {
      // Reporting must never throw — it is the last line of defence.
    }
  }

  /// Plain-text dump the user can copy and send to support.
  static Future<String> export() async {
    final entries = await readAll();
    if (entries.isEmpty) return 'No errors recorded.';
    return const JsonEncoder.withIndent('  ').convert(entries);
  }
}
