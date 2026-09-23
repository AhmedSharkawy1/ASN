import 'package:asn_app/features/auth/domain/entities/user_entity.dart';

abstract class AuthRepository {
  Future<UserEntity> login(String usernameOrEmail, String password, {bool rememberMe = true});
  Future<void> logout();
  Future<UserEntity?> checkSession();
}
