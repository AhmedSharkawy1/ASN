import 'package:freezed_annotation/freezed_annotation.dart';

part 'failures.freezed.dart';

@freezed
abstract class Failure with _$Failure {
  const Failure._();

  const factory Failure.server([String? message]) = ServerFailure;
  const factory Failure.cache([String? message]) = CacheFailure;
  const factory Failure.network([String? message]) = NetworkFailure;
  const factory Failure.auth([String? message]) = AuthFailure;
  const factory Failure.permission([String? message]) = PermissionFailure;

  @override
  String? get message;
}
