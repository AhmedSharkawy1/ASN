class ServerException implements Exception {
  final String? message;
  const ServerException([this.message]);

  @override
  String toString() => message ?? 'ServerException';
}

class CacheException implements Exception {
  final String? message;
  const CacheException([this.message]);

  @override
  String toString() => message ?? 'CacheException';
}

class NetworkException implements Exception {
  final String? message;
  const NetworkException([this.message]);

  @override
  String toString() => message ?? 'NetworkException';
}

class AuthException implements Exception {
  final String? message;
  const AuthException([this.message]);

  @override
  String toString() => message ?? 'AuthException';
}

class PermissionException implements Exception {
  final String? message;
  const PermissionException([this.message]);

  @override
  String toString() => message ?? 'PermissionException';
}
