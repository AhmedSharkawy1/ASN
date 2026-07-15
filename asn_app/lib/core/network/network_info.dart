import 'dart:io';
import 'package:asn_app/core/network/connectivity_service.dart';
import 'package:asn_app/core/logging/logger.dart';

abstract class NetworkInfo {
  Future<bool> get isConnected;
  Stream<bool> get onConnectionStatusChanged;
}

class NetworkInfoImpl implements NetworkInfo {
  final ConnectivityService _connectivityService;

  NetworkInfoImpl(this._connectivityService);

  @override
  Future<bool> get isConnected async {
    final hasConnection = await _connectivityService.isConnected;
    if (!hasConnection) return false;

    // Direct ping to check active internet access
    try {
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 4));
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } on SocketException catch (_) {
      AppLogger.warning('Socket exception: Connected to network but no actual internet access', name: 'NetworkInfo');
      return false;
    } catch (e, stackTrace) {
      AppLogger.error('Active internet check failed', error: e, stackTrace: stackTrace, name: 'NetworkInfo');
      return false;
    }
  }

  @override
  Stream<bool> get onConnectionStatusChanged =>
      _connectivityService.onConnectivityChanged;
}
