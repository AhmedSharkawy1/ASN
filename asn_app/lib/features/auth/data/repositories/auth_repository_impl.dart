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
  Future<UserEntity> login(String usernameOrEmail, String password) async {
    final isOnline = await _networkInfo.isConnected;

    // Helper for offline fallback
    Future<UserEntity> performOfflineLogin() async {
      AppLogger.warning('Attempting offline login for: $usernameOrEmail', name: 'AuthRepo');
      final cachedUser = await _localDataSource.getCachedUserSession();
      final cachedPw = await _localDataSource.getOfflinePassword();

      if (cachedUser != null && cachedPw == password) {
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
      await _localDataSource.saveOfflinePassword(password);

      // Fetch User Role
      final role = await _remoteDataSource.fetchUserRole(user.id) ?? 'staff';
      String? restaurantId;
      String name = usernameOrEmail;
      Map<String, bool> permissions = {};

      if (role == 'super_admin') {
        name = 'Super Admin';
        permissions = {'_isSuperAdmin': true};
      } else if (role == 'staff' || resolvedEmail.endsWith('.asn')) {
        // Staff Profile
        final staffProfile = await _remoteDataSource.fetchStaffProfile(user.id);
        if (staffProfile == null) {
          throw const AuthException('لم يتم العثور على حساب الموظف');
        }
        final isActive = staffProfile['is_active'] as bool? ?? false;
        if (!isActive) {
          throw const AuthException('هذا الحساب غير مفعل حالياً');
        }

        restaurantId = staffProfile['restaurant_id'] as String?;
        name = staffProfile['name'] as String? ?? usernameOrEmail;
        
        // Parse permissions
        final staffPermsJson = staffProfile['permissions'];
        Map<String, bool> staffPerms = {};
        if (staffPermsJson is Map) {
          staffPerms = Map<String, bool>.from(staffPermsJson.map((k, v) => MapEntry(k.toString(), v == true)));
        }

        // Apply tenant client_page_access filter
        if (restaurantId != null) {
          final clientPages = await _remoteDataSource.fetchClientPageAccess(restaurantId);
          for (final page in clientPages) {
            final key = page['page_key'] as String;
            final isEnabled = page['enabled'] as bool? ?? true;
            // Staff permission is true only if both staff is allowed AND tenant is allowed
            if (staffPerms.containsKey(key)) {
              permissions[key] = staffPerms[key]! && isEnabled;
            }
          }
        }
        permissions['_isAdmin'] = false;
      } else {
        // Owner Profile
        final restProfile = await _remoteDataSource.fetchRestaurantProfile(resolvedEmail);
        if (restProfile != null) {
          restaurantId = restProfile['id'] as String?;
          name = restProfile['name'] as String? ?? usernameOrEmail;

          // Fetch tenant client_page_access
          if (restaurantId != null) {
            final clientPages = await _remoteDataSource.fetchClientPageAccess(restaurantId);
            for (final page in clientPages) {
              final key = page['page_key'] as String;
              permissions[key] = page['enabled'] as bool? ?? true;
            }
          }
          permissions['_isAdmin'] = true;
        } else {
          // Fallback check if owner email matches staff profile (rare)
          final staffFallback = await _remoteDataSource.fetchStaffProfile(user.id);
          if (staffFallback != null) {
            restaurantId = staffFallback['restaurant_id'] as String?;
            name = staffFallback['name'] as String? ?? usernameOrEmail;
            permissions['_isAdmin'] = false;
          } else {
            throw const AuthException('تعذر العثور على بيانات المطعم المرتبطة');
          }
        }
      }

      final userModel = UserModel(
        id: user.id,
        email: user.email ?? resolvedEmail,
        name: name,
        role: role,
        restaurantId: restaurantId,
        permissions: permissions,
      );

      // Cache session locally
      await _localDataSource.cacheUserSession(userModel);
      
      return userModel.toEntity();
    } catch (e) {
      // If any network/server exception occurs during online login, attempt offline fallback
      if (e is ServerException || e is NetworkException || e.toString().contains('Dio') || e.toString().contains('SocketException')) {
        AppLogger.warning('Online login failed due to network/server, falling back to offline mode. Error: $e', name: 'AuthRepo');
        return await performOfflineLogin();
      }
      rethrow;
    }
    } on AuthException {
      rethrow;
    } catch (e, stackTrace) {
      AppLogger.error('Login process failed', error: e, stackTrace: stackTrace, name: 'AuthRepo');
      throw ServerException(e.toString());
    }
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
    final isOnline = await _networkInfo.isConnected;

    if (!isOnline) {
      // Offline fallback: load cached session
      final cachedSession = await _localDataSource.getCachedUserSession();
      return cachedSession?.toEntity();
    }

    try {
      final token = await _localDataSource.getAuthToken();
      if (token == null || token.isEmpty) return null;

      // Online check using Supabase instance state
      final supabaseUser = SupabaseClientManager.client.auth.currentUser;
      if (supabaseUser != null) {
        final cached = await _localDataSource.getCachedUserSession();
        if (cached != null && cached.id == supabaseUser.id) {
          return cached.toEntity();
        }
      }

      // No active session in memory, try silent auto login with refresh token
      final refreshToken = await _localDataSource.getRefreshToken();
      if (refreshToken != null && refreshToken.isNotEmpty) {
        AppLogger.info('Refreshing user session silenty...', name: 'AuthRepo');
        final response = await SupabaseClientManager.client.auth.setSession(refreshToken);
        if (response.session != null && response.user != null) {
          // Re-login flow to load updated permissions
          final cachedPw = await _localDataSource.getOfflinePassword();
          if (cachedPw != null && cachedPw.isNotEmpty) {
            return await login(response.user!.email ?? '', cachedPw);
          }
        }
      }
    } catch (e, stackTrace) {
      AppLogger.error('Check session check failed', error: e, stackTrace: stackTrace, name: 'AuthRepo');
    }
    return null;
  }
}
