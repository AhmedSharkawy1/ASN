import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_entity.freezed.dart';

enum UserRole {
  superAdmin,
  admin,
  staff,
}

@freezed
abstract class UserEntity with _$UserEntity {
  const factory UserEntity({
    required String id,
    required String email,
    required String name,
    required UserRole role,
    required String? restaurantId,
    required Map<String, bool> permissions,
  }) = _UserEntity;
}
