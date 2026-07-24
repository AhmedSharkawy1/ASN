import 'package:flutter/material.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

/// Rounded search field with the app's standard styling and clear affordance.
class AppSearchField extends StatelessWidget {
  final ValueChanged<String> onChanged;
  final String? hint;

  const AppSearchField({super.key, required this.onChanged, this.hint});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, 0),
      child: TextField(
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: hint ?? l10n.searchHint,
          prefixIcon: const Icon(Icons.search, size: 22),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
            borderSide: BorderSide(color: Theme.of(context).colorScheme.outline),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
            borderSide: BorderSide(color: Theme.of(context).colorScheme.outline),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
            borderSide: BorderSide(color: Theme.of(context).colorScheme.primary, width: 1.5),
          ),
          isDense: true,
        ),
      ),
    );
  }
}
