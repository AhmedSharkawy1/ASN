import 'dart:io';

import 'package:in_app_update/in_app_update.dart';

import 'package:asn_app/core/logging/logger.dart';

/// Outcome of asking Google Play whether a newer build is published.
enum UpdateCheck {
  /// A newer version is on Play and can be downloaded in the background.
  available,

  /// Already current, or Play has nothing to offer.
  upToDate,

  /// Play could not answer — sideloaded build, no Play Store, offline, or a
  /// non-Android platform. Never surfaced to the user.
  unavailable,
}

/// Offers the user a newer build without ever standing in their way.
///
/// Deliberately uses Play's *flexible* update: the download runs in the
/// background while the app stays fully usable, and the new version is only
/// swapped in when the user agrees to restart. A staff member mid-order is
/// never interrupted, and skipping the update costs them nothing.
///
/// Play only answers for builds it installed, so on a sideloaded APK — which
/// is how the app is tested — every check reports [UpdateCheck.unavailable].
/// That is treated as "nothing to say", never as an error worth showing.
class AppUpdateService {
  AppUpdateService._();

  /// Set once a download has finished, so the UI can offer the restart.
  static bool downloadReady = false;

  static Future<UpdateCheck> check() async {
    if (!Platform.isAndroid) return UpdateCheck.unavailable;

    try {
      final info = await InAppUpdate.checkForUpdate();

      // Play can report an update that no flow is allowed to install (for
      // example while metered-connection rules apply). Offering it would give
      // the user a button that cannot work.
      if (info.updateAvailability == UpdateAvailability.updateAvailable &&
          info.flexibleUpdateAllowed) {
        return UpdateCheck.available;
      }

      // A download from an earlier run may already be sitting there waiting to
      // be installed.
      if (info.installStatus == InstallStatus.downloaded) {
        downloadReady = true;
        return UpdateCheck.available;
      }

      return UpdateCheck.upToDate;
    } catch (e) {
      // Sideloaded build, no Play services, or simply offline. All of these
      // mean "cannot tell", and none of them are the user's problem.
      AppLogger.info('Update check unavailable: $e', name: 'AppUpdate');
      return UpdateCheck.unavailable;
    }
  }

  /// Starts the background download. Returns false when Play declines or the
  /// user dismisses its consent sheet.
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

  /// Restarts into the downloaded version. Only meaningful once a download has
  /// finished; Play itself performs the restart.
  static Future<void> installDownloaded() async {
    try {
      await InAppUpdate.completeFlexibleUpdate();
    } catch (e) {
      AppLogger.warning('Could not install the downloaded update: $e', name: 'AppUpdate');
    }
  }
}
