import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:asn_app/core/network/api_client.dart';
import 'package:asn_app/core/network/connectivity_service.dart';
import 'package:asn_app/core/network/network_info.dart';
import 'package:asn_app/core/storage/secure_storage.dart';
import 'package:asn_app/core/theme/theme_provider.dart'; // shares preferencesProvider
import 'package:asn_app/features/auth/domain/entities/user_entity.dart';
import 'package:asn_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:asn_app/features/auth/domain/usecases/login_usecase.dart';
import 'package:asn_app/features/auth/domain/usecases/logout_usecase.dart';
import 'package:asn_app/features/auth/domain/usecases/check_session_usecase.dart';
import 'package:asn_app/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:asn_app/features/auth/data/datasources/auth_local_datasource.dart';
import 'package:asn_app/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:asn_app/core/error/error_handler.dart';
import 'package:asn_app/core/services/order_notification_service.dart';

part 'auth_provider.freezed.dart';

@freezed
class AuthState with _$AuthState {
  const factory AuthState.initial() = AuthInitial;
  const factory AuthState.loading() = AuthLoading;
  const factory AuthState.authenticated(UserEntity user) = AuthAuthenticated;
  const factory AuthState.unauthenticated() = AuthUnauthenticated;
  const factory AuthState.error(String message) = AuthError;
}

// Storage DI
final secureStorageProvider = Provider<SecureStorage>((ref) => SecureStorage());

// Network DI
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  ref.onDispose(service.dispose);
  return service;
});

final networkInfoProvider = Provider<NetworkInfo>((ref) {
  final connectivity = ref.watch(connectivityServiceProvider);
  return NetworkInfoImpl(connectivity);
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  return ApiClient(secureStorage);
});

// DataSource DI
final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthRemoteDataSourceImpl(apiClient);
});

final authLocalDataSourceProvider = Provider<AuthLocalDataSource>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  final preferences = ref.watch(preferencesProvider);
  return AuthLocalDataSourceImpl(secureStorage, preferences);
});

// Repository DI
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final remote = ref.watch(authRemoteDataSourceProvider);
  final local = ref.watch(authLocalDataSourceProvider);
  final network = ref.watch(networkInfoProvider);
  return AuthRepositoryImpl(
    remoteDataSource: remote,
    localDataSource: local,
    networkInfo: network,
  );
});

// UseCases DI
final loginUseCaseProvider = Provider<LoginUseCase>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  return LoginUseCase(repo);
});

final logoutUseCaseProvider = Provider<LogoutUseCase>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  return LogoutUseCase(repo);
});

final checkSessionUseCaseProvider = Provider<CheckSessionUseCase>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  return CheckSessionUseCase(repo);
});

// State Notifier Provider
class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    return const AuthState.initial();
  }

  Future<void> checkSession() async {
    state = const AuthState.loading();
    try {
      final user = await ref.read(checkSessionUseCaseProvider).call();
      if (user != null) {
        state = AuthState.authenticated(user);
        if (user.restaurantId != null) {
          ref.read(orderNotificationServiceProvider).startListening(user.restaurantId!);
        }
      } else {
        state = const AuthState.unauthenticated();
      }
    } catch (e) {
      state = const AuthState.unauthenticated();
    }
  }

  Future<void> login(String usernameOrEmail, String password, String language) async {
    state = const AuthState.loading();
    try {
      final user = await ref.read(loginUseCaseProvider).call(usernameOrEmail, password);
      state = AuthState.authenticated(user);
      if (user.restaurantId != null) {
        ref.read(orderNotificationServiceProvider).startListening(user.restaurantId!);
      }
    } catch (e) {
      final failure = ErrorHandler.handleException(e);
      final message = ErrorHandler.getMessage(failure, language: language);
      state = AuthState.error(message);
    }
  }

  Future<void> logout() async {
    state = const AuthState.loading();
    try {
      ref.read(orderNotificationServiceProvider).stopListening();
      await ref.read(logoutUseCaseProvider).call();
      state = const AuthState.unauthenticated();
    } catch (e) {
      state = const AuthState.unauthenticated();
    }
  }
}

final authNotifierProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});
