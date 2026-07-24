import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/hr/data/models/employee_model.dart';
import 'package:asn_app/features/hr/data/models/attendance_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

String? _restaurantIdOf(Ref ref) {
  final authState = ref.read(authNotifierProvider);
  return authState.maybeWhen(
    authenticated: (user) => user.restaurantId,
    orElse: () => null,
  );
}

class EmployeesNotifier extends Notifier<AsyncValue<List<EmployeeModel>>> {
  @override
  AsyncValue<List<EmployeeModel>> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetchEmployees();
    return const AsyncValue.loading();
  }

  Future<void> _fetchEmployees() async {
    // HR tables key the tenant as tenant_id (see hr_migration.sql)
    final tenantId = _restaurantIdOf(ref);
    if (tenantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final response = await SupabaseClientManager.client
          .from('hr_employees')
          .select()
          .eq('tenant_id', tenantId)
          .order('full_name', ascending: true);

      final employees = (response as List)
          .map((json) => EmployeeModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(employees);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to load employees', error: e, stackTrace: stackTrace, name: 'HRProvider');
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchEmployees();
  }

  Future<void> toggleActive(String employeeId, bool currentStatus) async {
    try {
      await SupabaseClientManager.client
          .from('hr_employees')
          .update({'is_active': !currentStatus, 'updated_at': DateTime.now().toIso8601String()})
          .eq('id', employeeId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle employee', error: e, stackTrace: stackTrace, name: 'HRProvider');
      throw Exception('Failed to update employee: $e');
    }
  }
}

final employeesNotifierProvider =
    NotifierProvider<EmployeesNotifier, AsyncValue<List<EmployeeModel>>>(() {
  return EmployeesNotifier();
});

class TodayAttendanceNotifier extends Notifier<AsyncValue<List<AttendanceModel>>> {
  @override
  AsyncValue<List<AttendanceModel>> build() {
    _fetchAttendance();
    return const AsyncValue.loading();
  }

  Future<void> _fetchAttendance() async {
    final tenantId = _restaurantIdOf(ref);
    if (tenantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final today = DateTime.now();
      final dateStr =
          '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

      final response = await SupabaseClientManager.client
          .from('hr_attendance')
          .select('*, hr_employees(full_name)')
          .eq('tenant_id', tenantId)
          .eq('date', dateStr)
          .order('check_in', ascending: false);

      final records = (response as List)
          .map((json) => AttendanceModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(records);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to load attendance', error: e, stackTrace: stackTrace, name: 'HRProvider');
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchAttendance();
  }
}

final todayAttendanceNotifierProvider =
    NotifierProvider<TodayAttendanceNotifier, AsyncValue<List<AttendanceModel>>>(() {
  return TodayAttendanceNotifier();
});
