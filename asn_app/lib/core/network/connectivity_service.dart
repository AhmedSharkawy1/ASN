import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:asn_app/core/logging/logger.dart';

class ConnectivityService {
  final Connectivity _connectivity;
  final _controller = StreamController<bool>.broadcast();

  ConnectivityService([Connectivity? connectivity])
      : _connectivity = connectivity ?? Connectivity() {
    _init();
  }

  Stream<bool> get onConnectivityChanged => _controller.stream;

  void _init() {
    _connectivity.onConnectivityChanged.listen((List<ConnectivityResult> results) {
      final isOnline = _checkIsOnline(results);
      AppLogger.info('Connectivity changed: isOnline = $isOnline', name: 'Connectivity');
      _controller.add(isOnline);
    });
  }

  Future<bool> get isConnected async {
    try {
      final results = await _connectivity.checkConnectivity();
      return _checkIsOnline(results);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to check connectivity', error: e, stackTrace: stackTrace, name: 'Connectivity');
      return false;
    }
  }

  bool _checkIsOnline(List<ConnectivityResult> results) {
    if (results.isEmpty) return false;
    // If any result in the list is not 'none', we are connected to a network.
    return results.any((result) => result != ConnectivityResult.none);
  }

  void dispose() {
    _controller.close();
  }
}
