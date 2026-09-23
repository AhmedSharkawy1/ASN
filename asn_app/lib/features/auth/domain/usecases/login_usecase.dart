import 'package:asn_app/features/auth/domain/entities/user_entity.dart';
import 'package:asn_app/features/auth/domain/repositories/auth_repository.dart';

class LoginUseCase {
  final AuthRepository _repository;

  LoginUseCase(this._repository);

  Future<UserEntity> call(String usernameOrEmail, String password, {bool rememberMe = true}) {
    return _repository.login(usernameOrEmail, password, rememberMe: rememberMe);
  }
}
