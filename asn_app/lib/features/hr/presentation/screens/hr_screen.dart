import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/hr/data/models/employee_model.dart';
import 'package:asn_app/features/hr/data/models/attendance_model.dart';
import 'package:asn_app/features/hr/presentation/providers/hr_provider.dart';

class HRScreen extends ConsumerWidget {
  const HRScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.hr),
          bottom: TabBar(
            tabs: [
              Tab(text: l10n.employees, icon: const Icon(Icons.badge_outlined, size: 20)),
              Tab(text: l10n.attendance, icon: const Icon(Icons.fingerprint, size: 20)),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () {
                ref.read(employeesNotifierProvider.notifier).refresh();
                ref.read(todayAttendanceNotifierProvider.notifier).refresh();
              },
            ),
          ],
        ),
        drawer: const AppNavigationDrawer(),
        body: const TabBarView(
          children: [
            _EmployeesTab(),
            _AttendanceTab(),
          ],
        ),
      ),
    );
  }
}

class _EmployeesTab extends ConsumerWidget {
  const _EmployeesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final employeesAsync = ref.watch(employeesNotifierProvider);

    return employeesAsync.when(
      data: (employees) {
        if (employees.isEmpty) {
          return AppEmptyState(icon: Icons.badge_outlined, message: l10n.noEmployees);
        }

        return RefreshIndicator(
          onRefresh: () => ref.read(employeesNotifierProvider.notifier).refresh(),
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: employees.length,
            separatorBuilder: (context, index) => AppSpacing.heightXs,
            itemBuilder: (context, index) => _EmployeeCard(employee: employees[index]),
          ),
        );
      },
      loading: () => const AppListSkeleton(),
      error: (err, stack) => AppErrorState(
        error: err,
        onRetry: () => ref.read(employeesNotifierProvider.notifier).refresh(),
      ),
    );
  }
}

class _EmployeeCard extends ConsumerWidget {
  final EmployeeModel employee;

  const _EmployeeCard({required this.employee});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.tealPrimary.withValues(alpha: 0.1),
            backgroundImage: employee.profilePhotoUrl != null
                ? CachedNetworkImageProvider(employee.profilePhotoUrl!)
                : null,
            child: employee.profilePhotoUrl == null
                ? const Icon(Icons.person, color: AppColors.tealPrimary)
                : null,
          ),
          AppSpacing.widthSm,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  employee.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (employee.jobTitle?.isNotEmpty == true) employee.jobTitle!,
                    if (employee.department?.isNotEmpty == true) employee.department!,
                    if (employee.phone?.isNotEmpty == true) employee.phone!,
                  ].join(' • '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs, vertical: AppSpacing.xxs),
            decoration: BoxDecoration(
              color: (employee.isActive ? AppColors.success : Colors.grey).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
            ),
            child: Text(
              employee.isActive ? l10n.active : l10n.inactive,
              style: TextStyle(
                color: employee.isActive ? AppColors.success : Colors.grey,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AttendanceTab extends ConsumerWidget {
  const _AttendanceTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final attendanceAsync = ref.watch(todayAttendanceNotifierProvider);

    return attendanceAsync.when(
      data: (records) {
        if (records.isEmpty) {
          return AppEmptyState(icon: Icons.fingerprint, message: l10n.noAttendanceToday);
        }

        return RefreshIndicator(
          onRefresh: () => ref.read(todayAttendanceNotifierProvider.notifier).refresh(),
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: records.length,
            separatorBuilder: (context, index) => AppSpacing.heightXs,
            itemBuilder: (context, index) => _AttendanceCard(record: records[index]),
          ),
        );
      },
      loading: () => const AppListSkeleton(),
      error: (err, stack) => AppErrorState(
        error: err,
        onRetry: () => ref.read(todayAttendanceNotifierProvider.notifier).refresh(),
      ),
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  final AttendanceModel record;

  const _AttendanceCard({required this.record});

  Color _statusColor() {
    switch (record.status) {
      case 'present':
        return AppColors.success;
      case 'late':
        return AppColors.warning;
      case 'absent':
        return AppColors.error;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(AppLocalizations l10n) {
    switch (record.status) {
      case 'present':
        return l10n.present;
      case 'late':
        return l10n.late;
      case 'absent':
        return l10n.absent;
      case 'early_leave':
        return l10n.earlyLeave;
      default:
        return record.status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final timeFormat = DateFormat('HH:mm');
    final color = _statusColor();

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: color.withValues(alpha: 0.1),
            child: Icon(
              record.checkOut != null ? Icons.logout : Icons.login,
              color: color,
              size: 20,
            ),
          ),
          AppSpacing.widthSm,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  record.employeeName ?? '—',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (record.checkIn != null) '${l10n.checkIn}: ${timeFormat.format(record.checkIn!)}',
                    if (record.checkOut != null) '${l10n.checkOut}: ${timeFormat.format(record.checkOut!)}',
                    if (record.workedHours > 0) '${record.workedHours.toStringAsFixed(1)} ${l10n.hoursShort}',
                  ].join(' • '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          if (record.faceVerifiedIn)
            const Padding(
              padding: EdgeInsets.only(left: 4, right: 4),
              child: Icon(Icons.verified_user, size: 18, color: AppColors.success),
            ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs, vertical: AppSpacing.xxs),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
            ),
            child: Text(
              _statusLabel(l10n),
              style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}

