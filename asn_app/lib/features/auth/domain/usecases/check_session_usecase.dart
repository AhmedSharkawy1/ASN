import 'package:asn_app/features/auth/domain/entities/user_entity.dart';
import 'package:asn_app/features/auth/domain/repositories/auth_repository.dart';

class CheckSessionUseCase {
  final AuthRepository _repository;

  CheckSessionUseCase(this._repository);

  Future<UserEntity?> call() {
    return _repository.checkSession();
  }
}
