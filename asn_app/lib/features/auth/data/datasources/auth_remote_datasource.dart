import 'package:supabase_flutter/supabase_flutter.dart' hide AuthException;
import 'package:supabase_flutter/supabase_flutter.dart' as sb show AuthException;
import 'package:asn_app/core/network/api_client.dart';
import 'package:asn_app/core/error/exceptions.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';

abstract class AuthRemoteDataSource {
  Future<String> lookupEmail(String username);
  Future<AuthResponse> signIn(String email, String password);
  Future<String?> fetchUserRole(String userId);
  Future<Map<String, dynamic>?> fetchStaffProfile(String userId);
  Future<Map<String, dynamic>?> fetchRestaurantProfile(String email);
  Future<List<Map<String, dynamic>>> fetchClientPageAccess(String restaurantId);
  Future<void> signOut();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _apiClient;
  final SupabaseClient _supabaseClient;

  AuthRemoteDataSourceImpl(this._apiClient)
      : _supabaseClient = SupabaseClientManager.client;

  @override
  Future<String> lookupEmail(String username) async {
    try {
      AppLogger.info('Looking up email for staff username: $username', name: 'AuthRemote');
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/api/auth/lookup',
        data: {'username': username},
      );

      final email = response.data?['email'] as String?;
      if (email == null) {
        throw const AuthException('Invalid lookup response from server');
      }
      return email;
    } on AuthException {
      rethrow;
    } catch (e, stackTrace) {
      AppLogger.error('Failed to look up email for username', error: e, stackTrace: stackTrace, name: 'AuthRemote');
      throw const AuthException('اسم المستخدم غير صحيح أو غير موجود');
    }
  }

  @override
  Future<AuthResponse> signIn(String email, String password) async {
    try {
      AppLogger.info('Signing in with email: $email', name: 'AuthRemote');
      final response = await _supabaseClient.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return response;
    } on sb.AuthException catch (e) {
      AppLogger.warning('Authentication credentials rejected: ${e.message}', name: 'AuthRemote');
      throw AuthException(e.message);
    } catch (e, stackTrace) {
      AppLogger.error('Supabase sign-in error occurred', error: e, stackTrace: stackTrace, name: 'AuthRemote');
      throw ServerException(e.toString());
    }
  }

  @override
  Future<String?> fetchUserRole(String userId) async {
    try {
      final data = await _supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
      return data?['role'] as String?;
    } catch (e, stackTrace) {
      AppLogger.error('Failed to fetch user role', error: e, stackTrace: stackTrace, name: 'AuthRemote');
      return null;
    }
  }

  @override
  Future<Map<String, dynamic>?> fetchStaffProfile(String userId) async {
    try {
      return await _supabaseClient
          .from('team_members')
          .select('restaurant_id, permissions, is_active, name')
          .eq('auth_id', userId)
          .maybeSingle();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to fetch staff profile', error: e, stackTrace: stackTrace, name: 'AuthRemote');
      return null;
    }
  }

  @override
  Future<Map<String, dynamic>?> fetchRestaurantProfile(String email) async {
    try {
      return await _supabaseClient
          .from('restaurants')
          .select('id, name')
          .ilike('email', email)
          .maybeSingle();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to fetch restaurant profile', error: e, stackTrace: stackTrace, name: 'AuthRemote');
      return null;
    }
  }

  @override
  Future<List<Map<String, dynamic>>> fetchClientPageAccess(String restaurantId) async {
    try {
      final response = await _supabaseClient
          .from('client_page_access')
          .select('page_key, enabled')
          .eq('tenant_id', restaurantId);
      
      return List<Map<String, dynamic>>.from(response);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to fetch client page access', error: e, stackTrace: stackTrace, name: 'AuthRemote');
      return [];
    }
  }

  @override
  Future<void> signOut() async {
    try {
      await _supabaseClient.auth.signOut();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to sign out from Supabase', error: e, stackTrace: stackTrace, name: 'AuthRemote');
      throw const ServerException('Failed to complete logout on server');
    }
  }
}
