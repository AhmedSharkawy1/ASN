import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart' show User;

import 'package:asn_app/core/config/app_modules.dart';
import 'package:asn_app/core/network/network_info.dart';
import 'package:asn_app/core/error/exceptions.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/features/auth/domain/entities/user_entity.dart';
import 'package:asn_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:asn_app/features/auth/data/models/user_model.dart';
import 'package:asn_app/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:asn_app/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:asn_app/shared/data/supabase_client.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final AuthLocalDataSource _localDataSource;
  final NetworkInfo _networkInfo;

  AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required AuthLocalDataSource localDataSource,
    required NetworkInfo networkInfo,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource,
        _networkInfo = networkInfo;

  @override
  Future<UserEntity> login(String usernameOrEmail, String password, {bool rememberMe = true}) async {
    await _localDataSource.saveRememberMe(rememberMe);
    final isOnline = await _networkInfo.isConnected;

    // Helper for offline fallback
    Future<UserEntity> performOfflineLogin() async {
      AppLogger.warning('Attempting offline login for: $usernameOrEmail', name: 'AuthRepo');
      final cachedUser = await _localDataSource.getCachedUserSession();
      final passwordMatches = await _localDataSource.verifyOfflinePassword(password);

      if (cachedUser != null && passwordMatches) {
        if (cachedUser.email == usernameOrEmail || cachedUser.name == usernameOrEmail) {
          AppLogger.info('Offline login success for cached user: ${cachedUser.id}', name: 'AuthRepo');
          return cachedUser.toEntity();
        }
      }
      throw const NetworkException('أنت أوفلاين. تأكد من البيانات أو اتصل بالإنترنت أولاً.');
    }

    if (!isOnline) {
      return await performOfflineLogin();
    }

    // Online Flow
    try {
      String resolvedEmail = usernameOrEmail.trim();

      // Resolve internal email if staff username
      if (!resolvedEmail.contains('@')) {
        resolvedEmail = await _remoteDataSource.lookupEmail(resolvedEmail);
      }

      // Supabase Sign In
      final authResponse = await _remoteDataSource.signIn(resolvedEmail, password);
      final session = authResponse.session;
      final user = authResponse.user;

      if (session == null || user == null) {
        throw const AuthException('فشل تسجيل الدخول: لا توجد جلسة نشطة');
      }

      // Save tokens
      await _localDataSource.saveAuthToken(session.accessToken);
      if (session.refreshToken != null) {
        await _localDataSource.saveRefreshToken(session.refreshToken!);
      }
      await _localDataSource.saveOfflinePasswordHash(password);

      return await _buildProfile(
        user: user,
        resolvedEmail: resolvedEmail,
        fallbackName: usernameOrEmail,
      );
    } on AuthException {
      rethrow;
    } catch (e, stackTrace) {
      // If any network/server exception occurs during online login, attempt offline fallback
      if (e is ServerException || e is NetworkException || e.toString().contains('Dio') || e.toString().contains('SocketException') || e.toString().contains('ClientException')) {
        AppLogger.warning('Online login failed due to network/server, falling back to offline mode. Error: $e', name: 'AuthRepo');
        return await performOfflineLogin();
      }
      AppLogger.error('Login process failed', error: e, stackTrace: stackTrace, name: 'AuthRepo');
      throw ServerException(e.toString());
    }
  }

  /// Resolves role, restaurant and permissions for an already-authenticated
  /// Supabase user, then caches the session.
  ///
  /// Split out of [login] so session restore can rebuild the same profile from
  /// a refresh token alone — previously it re-ran a full password login, which
  /// was the only reason the password had to be kept on the device.
  Future<UserEntity> _buildProfile({
    required User user,
    required String resolvedEmail,
    required String fallbackName,
  }) async {
    final usernameOrEmail = fallbackName;
    final role = await _remoteDataSource.fetchUserRole(user.id);
    String? restaurantId;
    String name = usernameOrEmail;
    Map<String, bool> permissions = {};
    String resolvedRole = role ?? 'staff';

    if (role == 'super_admin') {
      name = 'Super Admin';
      permissions = {'_isSuperAdmin': true};
      resolvedRole = 'super_admin';
    } else {
      // Check if user is staff (team member)
      Map<String, dynamic>? staffProfile;
      final isAsnEmail = resolvedEmail.endsWith('.asn');

      if (role == 'staff' || isAsnEmail) {
        staffProfile = await _remoteDataSource.fetchStaffProfile(
          user.id,
          email: resolvedEmail,
          username: usernameOrEmail,
        );
      }

      Map<String, dynamic>? restProfile;
      if (staffProfile == null && !isAsnEmail) {
        restProfile = await _remoteDataSource.fetchRestaurantProfile(resolvedEmail);
      }

      if (staffProfile == null && restProfile == null) {
        staffProfile = await _remoteDataSource.fetchStaffProfile(
          user.id,
          email: resolvedEmail,
          username: usernameOrEmail,
        );
      }

      if (restProfile != null) {
        // Restaurant owner / admin
        restaurantId = restProfile['id'] as String?;
        name = restProfile['name'] as String? ?? usernameOrEmail;
        resolvedRole = 'admin';

        if (restaurantId != null) {
          final clientPages = await _remoteDataSource.fetchClientPageAccess(restaurantId);
          for (final page in clientPages) {
            final key = page['page_key'] as String;
            permissions[key] = page['enabled'] as bool? ?? true;
          }
        }
        permissions['_isAdmin'] = true;
      } else if (staffProfile != null) {
        // Confirmed staff / team member
        final isActive = staffProfile['is_active'] as bool? ?? false;
        if (!isActive) {
          throw const AuthException('هذا الحساب غير مفعل حالياً');
        }

        restaurantId = staffProfile['restaurant_id'] as String?;
        name = staffProfile['name'] as String? ?? usernameOrEmail;
        final rawRole = (staffProfile['role'] as String? ?? 'staff').toLowerCase();
        resolvedRole = rawRole;

        // Parse staff permissions
        dynamic staffPermsJson = staffProfile['permissions'];
        if (staffPermsJson is String) {
          try {
            staffPermsJson = json.decode(staffPermsJson);
          } catch (_) {}
        }
        Map<String, bool> staffPerms = {};
        if (staffPermsJson is Map) {
          staffPerms = Map<String, bool>.from(
            staffPermsJson.map((k, v) => MapEntry(k.toString(), v == true)),
          );
        }

        // Apply role-based default permissions if omitted
        if (rawRole == 'cashier') {
          staffPerms.putIfAbsent('pos', () => true);
          staffPerms.putIfAbsent('orders', () => true);
        } else if (rawRole == 'kitchen') {
          staffPerms.putIfAbsent('kitchen', () => true);
          staffPerms.putIfAbsent('orders', () => true);
        } else if (rawRole == 'delivery') {
          staffPerms.putIfAbsent('delivery', () => true);
          staffPerms.putIfAbsent('orders', () => true);
        } else if (rawRole == 'admin' || rawRole == 'manager') {
          for (final key in AppModules.visibleRoutes.values) {
            staffPerms.putIfAbsent(key, () => true);
          }
        }

        // Staff permissions start with granted staff permissions ONLY
        permissions = Map<String, bool>.from(staffPerms);

        // Apply tenant client_page_access filter: if tenant disabled a page, override to false
        if (restaurantId != null) {
          final clientPages = await _remoteDataSource.fetchClientPageAccess(restaurantId);
          for (final page in clientPages) {
            final key = page['page_key'] as String;
            final isEnabled = page['enabled'] as bool? ?? true;
            if (!isEnabled) {
              permissions[key] = false;
            }
          }
        }

        permissions['_isAdmin'] = (rawRole == 'admin' || rawRole == 'manager');
      } else {
        throw const AuthException('تعذر العثور على بيانات الحساب المرتبطة');
      }
    }

    final userModel = UserModel(
      id: user.id,
      email: user.email ?? resolvedEmail,
      name: name,
      role: resolvedRole,
      restaurantId: restaurantId,
      permissions: permissions,
    );

    // Cache session locally
    await _localDataSource.cacheUserSession(userModel);

    return userModel.toEntity();
  }

  @override
  Future<void> logout() async {
    final isOnline = await _networkInfo.isConnected;
    if (isOnline) {
      try {
        await _remoteDataSource.signOut();
      } catch (e) {
        AppLogger.warning('Sign out remote fail (non-blocking): $e', name: 'AuthRepo');
      }
    }

    // Clear local storage
    await _localDataSource.deleteAuthToken();
    await _localDataSource.deleteRefreshToken();
    await _localDataSource.deleteOfflinePassword();
    await _localDataSource.clearCachedUserSession();
    AppLogger.info('Local session cleared successfully', name: 'AuthRepo');
  }

  @override
  Future<UserEntity?> checkSession() async {
    final rememberMe = _localDataSource.getRememberMe();
    if (!rememberMe) {
      AppLogger.info('Remember me is disabled. Skipping session auto-restore.', name: 'AuthRepo');
      return null;
    }

    final isOnline = await _networkInfo.isConnected;

    if (!isOnline) {
      // Offline fallback: load cached session
      final cachedSession = await _localDataSource.getCachedUserSession();
      return cachedSession?.toEntity();
    }

    try {
      final cached = await _localDataSource.getCachedUserSession();
      final token = await _localDataSource.getAuthToken();
      final refreshToken = await _localDataSource.getRefreshToken();

      // If no tokens and no cached session, definitely unauthenticated
      if ((token == null || token.isEmpty) && (refreshToken == null || refreshToken.isEmpty) && cached == null) {
        return null;
      }

      // 1. Check if Supabase already has a currentUser in memory
      final supabaseUser = SupabaseClientManager.client.auth.currentUser;
      if (supabaseUser != null) {
        if (cached != null && cached.id == supabaseUser.id) {
          try {
            final refreshed = await _buildProfile(
              user: supabaseUser,
              resolvedEmail: supabaseUser.email ?? cached.email,
              fallbackName: cached.name,
            );
            return refreshed;
          } catch (e) {
            AppLogger.warning('Background profile refresh failed, using cached session: $e', name: 'AuthRepo');
            return cached.toEntity();
          }
        }
      }

      // 2. Try silent session restoration using refresh token
      if (refreshToken != null && refreshToken.isNotEmpty) {
        AppLogger.info('Refreshing user session silently...', name: 'AuthRepo');
        try {
          final response = await SupabaseClientManager.client.auth.setSession(refreshToken);
          final refreshedUser = response.user;
          if (response.session != null && refreshedUser != null) {
            final email = refreshedUser.email ?? cached?.email ?? '';
            await _localDataSource.saveAuthToken(response.session!.accessToken);
            final newRefresh = response.session!.refreshToken;
            if (newRefresh != null && newRefresh.isNotEmpty) {
              await _localDataSource.saveRefreshToken(newRefresh);
            }
            try {
              return await _buildProfile(
                user: refreshedUser,
                resolvedEmail: email,
                fallbackName: cached?.name ?? email,
              );
            } catch (e) {
              AppLogger.warning('Profile build after setSession failed, using cached: $e', name: 'AuthRepo');
              if (cached != null) return cached.toEntity();
            }
          }
        } catch (e) {
          AppLogger.warning('setSession failed: $e', name: 'AuthRepo');
        }
      }

      // 3. If online refresh encountered transient issues but we have a valid cached session,
      // KEEP THE USER LOGGED IN!
      if (cached != null) {
        AppLogger.info('Returning cached session for auto-login: ${cached.name}', name: 'AuthRepo');
        return cached.toEntity();
      }
    } catch (e, stackTrace) {
      AppLogger.error('Check session check failed', error: e, stackTrace: stackTrace, name: 'AuthRepo');
      final cached = await _localDataSource.getCachedUserSession();
      if (cached != null) return cached.toEntity();
    }
    return null;
  }
}
