import 'dart:convert';
import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:in_app_update/in_app_update.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'package:asn_app/core/config/app_config.dart';
import 'package:asn_app/core/logging/logger.dart';

/// Outcome of asking Google Play or the version API whether a newer build is published.
enum UpdateCheck {
  /// A newer version is available and can be downloaded.
  available,

  /// Already current, or server has nothing newer.
  upToDate,

  /// Could not determine (offline or unreachable). Never surfaced to the user.
  unavailable,
}

/// Checks for newer builds via Google Play In-App Updates, with an automatic
/// fallback to the direct APK API endpoint for sideloaded/POS devices.
class AppUpdateService {
  AppUpdateService._();

  /// Set once a Google Play flexible download has finished.
  static bool downloadReady = false;

  /// Direct APK download URL when update is served via the API (sideloaded builds).
  static String? directApkDownloadUrl;

  /// The version name of the newer build (e.g. "1.5.6").
  static String? latestVersionName;

  /// Optional release notes for the update.
  static String? latestReleaseNotes;

  /// Whether the server flagged this update as mandatory (user cannot dismiss).
  static bool isMandatory = false;

  static bool _notifiedThisSession = false;

  static Future<UpdateCheck> check() async {
    if (!Platform.isAndroid) return UpdateCheck.unavailable;

    // 1. First attempt: Google Play In-App Update (works if installed from Play Store)
    try {
      final info = await InAppUpdate.checkForUpdate();

      if (info.updateAvailability == UpdateAvailability.updateAvailable &&
          info.flexibleUpdateAllowed) {
        await notifyUpdateAvailable();
        return UpdateCheck.available;
      }

      if (info.installStatus == InstallStatus.downloaded) {
        downloadReady = true;
        await notifyUpdateAvailable();
        return UpdateCheck.available;
      }

      if (info.updateAvailability == UpdateAvailability.updateNotAvailable) {
        return UpdateCheck.upToDate;
      }
    } catch (_) {
      // Play Store unavailable (e.g. sideloaded APK, no GMS) — seamlessly fall back to API check.
    }

    // 2. Second attempt: Direct APK version check from ASN API endpoint
    final apiCheck = await checkDirectApiUpdate();
    if (apiCheck == UpdateCheck.available) {
      await notifyUpdateAvailable();
    }
    return apiCheck;
  }

  /// Checks the /api/app/version endpoint for newer APK releases.
  static Future<UpdateCheck> checkDirectApiUpdate() async {
    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 6);

    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentBuild = int.tryParse(packageInfo.buildNumber) ?? 0;

      final req = await client.getUrl(Uri.parse('${AppConfig.apiBaseUrl}/api/app/version'));
      req.headers.set('Accept', 'application/json');
      final resp = await req.close();

      if (resp.statusCode != 200) {
        return UpdateCheck.unavailable;
      }

      final body = await resp.transform(utf8.decoder).join();
      final json = jsonDecode(body) as Map<String, dynamic>;

      final serverBuild = (json['build_number'] as num?)?.toInt() ?? 0;
      final serverVersion = json['version'] as String? ?? '';
      final downloadUrl = json['download_url'] as String? ?? '${AppConfig.apiBaseUrl}/api/app/download';
      final notes = json['release_notes'] as String?;
      final mandatory = json['mandatory'] as bool? ?? false;

      if (serverBuild > currentBuild) {
        directApkDownloadUrl = downloadUrl;
        latestVersionName = serverVersion.isNotEmpty ? serverVersion : null;
        latestReleaseNotes = notes;
        isMandatory = mandatory;
        return UpdateCheck.available;
      }

      return UpdateCheck.upToDate;
    } catch (e) {
      AppLogger.info('Direct API update check unavailable: $e', name: 'AppUpdate');
      return UpdateCheck.unavailable;
    } finally {
      client.close();
    }
  }

  /// Sends a local notification to alert the user that a new update is available.
  static Future<void> notifyUpdateAvailable() async {
    if (_notifiedThisSession) return;
    _notifiedThisSession = true;

    try {
      final notifications = FlutterLocalNotificationsPlugin();
      const androidDetails = AndroidNotificationDetails(
        'app_updates_channel',
        'تحديثات التطبيق',
        channelDescription: 'إشعارات توفر إصدارات جديدة لتطبيق ASN',
        importance: Importance.defaultImportance,
        priority: Priority.defaultPriority,
        icon: 'ic_notification',
      );
      const details = NotificationDetails(android: androidDetails);

      final versionText = latestVersionName != null ? ' ($latestVersionName)' : '';
      await notifications.show(
        id: 8888,
        title: 'تحديث جديد متاح 🚀',
        body: 'يتوفر إصدار جديد من تطبيق ASN$versionText. اضغط لتحديث التطبيق الآن.',
        notificationDetails: details,
        payload: directApkDownloadUrl ?? '${AppConfig.apiBaseUrl}/api/app/download',
      );
    } catch (e) {
      AppLogger.warning('Could not show update notification: $e', name: 'AppUpdate');
    }
  }

  /// Starts the Play Store background download.
  static Future<bool> startDownload() async {
    try {
      final result = await InAppUpdate.startFlexibleUpdate();
      final started = result == AppUpdateResult.success;
      if (started) downloadReady = true;
      return started;
    } catch (e) {
      AppLogger.warning('Could not start the update download: $e', name: 'AppUpdate');
      return false;
    }
  }

  /// Restarts into the downloaded version on Play Store.
  static Future<void> installDownloaded() async {
    try {
      await InAppUpdate.completeFlexibleUpdate();
    } catch (e) {
      AppLogger.warning('Could not install the downloaded update: $e', name: 'AppUpdate');
    }
  }
}
