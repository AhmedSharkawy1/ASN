import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';

class CustomersScreen extends ConsumerWidget {
  const CustomersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.customers),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Customer search coming soon!')),
              );
            },
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: 10,
        separatorBuilder: (context, index) => const Divider(),
        itemBuilder: (context, index) {
          // Dummy data to simulate the directory until backend is connected
          final isLoyal = index % 3 == 0;
          return ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
            leading: CircleAvatar(
              backgroundColor: AppColors.tealPrimary.withValues(alpha: 0.1),
              child: const Icon(Icons.person, color: AppColors.tealPrimary),
            ),
            title: Text('Customer #${1000 + index}', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('+1 555-010$index'),
            trailing: isLoyal
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text('VIP', style: TextStyle(color: AppColors.warning, fontSize: 12, fontWeight: FontWeight.bold)),
                  )
                : const Icon(Icons.chevron_right, color: Colors.grey),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Customer details coming soon!')),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Add new customer coming soon!')),
          );
        },
        backgroundColor: AppColors.tealPrimary,
        child: const Icon(Icons.person_add, color: Colors.white),
      ),
    );
  }
}
