import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:asn_app/features/auth/domain/entities/user_entity.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

@freezed
abstract class UserModel with _$UserModel {
  const UserModel._();

  const factory UserModel({
    required String id,
    required String email,
    required String name,
    required String role,
    required String? restaurantId,
    required Map<String, bool> permissions,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) => _$UserModelFromJson(json);

  UserEntity toEntity() {
    UserRole userRole;
    switch (role) {
      case 'super_admin':
        userRole = UserRole.superAdmin;
        break;
      case 'admin':
        userRole = UserRole.admin;
        break;
      case 'staff':
      default:
        userRole = UserRole.staff;
        break;
    }

    return UserEntity(
      id: id,
      email: email,
      name: name,
      role: userRole,
      restaurantId: restaurantId,
      permissions: permissions,
    );
  }

  factory UserModel.fromEntity(UserEntity entity) {
    return UserModel(
      id: entity.id,
      email: entity.email,
      name: entity.name,
      role: entity.role.name,
      restaurantId: entity.restaurantId,
      permissions: entity.permissions,
    );
  }
}
