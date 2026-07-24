import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/reports/presentation/providers/reports_provider.dart';

String _fmt(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final reportAsync = ref.watch(reportsNotifierProvider);
    final range = ref.watch(reportRangeProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.reports),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(reportsNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: Column(
        children: [
          // Date range selector
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, 0),
            child: SegmentedButton<ReportRange>(
              segments: [
                ButtonSegment(value: ReportRange.today, label: Text(l10n.rangeToday)),
                ButtonSegment(value: ReportRange.week, label: Text(l10n.range7d)),
                ButtonSegment(value: ReportRange.month, label: Text(l10n.range30d)),
              ],
              selected: {range},
              onSelectionChanged: (selection) =>
                  ref.read(reportRangeProvider.notifier).set(selection.first),
              showSelectedIcon: false,
            ),
          ),
          Expanded(
            child: reportAsync.when(
              data: (report) => RefreshIndicator(
                onRefresh: () => ref.read(reportsNotifierProvider.notifier).refresh(),
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  children: [
                    // Stat cards
                    GridView.count(
                      crossAxisCount: MediaQuery.of(context).size.width > 700 ? 4 : 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: AppSpacing.sm,
                      mainAxisSpacing: AppSpacing.sm,
                      childAspectRatio: 1.55,
                      children: [
                        _StatCard(
                          title: l10n.revenue,
                          value: _fmt(report.totalRevenue),
                          icon: Icons.payments_outlined,
                          color: AppColors.success,
                        ),
                        _StatCard(
                          title: l10n.totalOrders,
                          value: '${report.totalOrders}',
                          icon: Icons.receipt_long_outlined,
                          color: AppColors.info,
                        ),
                        _StatCard(
                          title: l10n.avgOrderValue,
                          value: _fmt(report.avgOrderValue),
                          icon: Icons.trending_up,
                          color: AppColors.warning,
                        ),
                        _StatCard(
                          title: l10n.cancelledOrders,
                          value: '${report.cancelledOrders}',
                          icon: Icons.cancel_outlined,
                          color: AppColors.error,
                        ),
                      ],
                    ),
                    AppSpacing.heightMd,

                    // Revenue trend chart
                    _SectionCard(
                      title: l10n.revenueTrend,
                      child: SizedBox(
                        height: 200,
                        child: report.trend.every((v) => v == 0)
                            ? Center(
                                child: Text(
                                  l10n.noOrders,
                                  style: const TextStyle(color: Colors.grey),
                                ),
                              )
                            : _TrendChart(report: report),
                      ),
                    ),
                    AppSpacing.heightMd,

                    // Top products
                    if (report.topProducts.isNotEmpty) ...[
                      _SectionCard(
                        title: l10n.topProducts,
                        child: Column(
                          children: report.topProducts.asMap().entries.map((entry) {
                            final rank = entry.key + 1;
                            final product = entry.value;
                            final maxQty = report.topProducts.first.quantity;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 26,
                                    child: Text(
                                      '$rank',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w900,
                                        color: rank <= 3 ? AppColors.warning : Colors.grey,
                                        fontSize: 15,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          product.title,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w600, fontSize: 13),
                                        ),
                                        const SizedBox(height: 3),
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(4),
                                          child: LinearProgressIndicator(
                                            value: maxQty > 0 ? product.quantity / maxQty : 0,
                                            minHeight: 5,
                                            backgroundColor:
                                                AppColors.tealPrimary.withValues(alpha: 0.08),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  AppSpacing.widthSm,
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        '${product.quantity} ${l10n.soldCount}',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w800, fontSize: 12),
                                      ),
                                      Text(
                                        _fmt(product.revenue),
                                        style: const TextStyle(
                                            color: AppColors.success,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 11),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      AppSpacing.heightMd,
                    ],

                    // Payment + order type breakdowns
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _SectionCard(
                            title: l10n.paymentBreakdown,
                            child: _BreakdownList(
                              entries: report.paymentBreakdown.entries
                                  .map((e) => (
                                        _paymentLabel(e.key, l10n),
                                        _fmt(e.value),
                                      ))
                                  .toList(),
                            ),
                          ),
                        ),
                        AppSpacing.widthSm,
                        Expanded(
                          child: _SectionCard(
                            title: l10n.orderTypeBreakdown,
                            child: _BreakdownList(
                              entries: report.orderTypeBreakdown.entries
                                  .map((e) => (
                                        _orderTypeLabel(e.key, l10n),
                                        '${e.value}',
                                      ))
                                  .toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    AppSpacing.heightLg,
                  ],
                ),
              ),
              loading: () => const AppListSkeleton(itemHeight: 110),
              error: (err, stack) => AppErrorState(
                error: err,
                onRetry: () => ref.read(reportsNotifierProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static String _paymentLabel(String key, AppLocalizations l10n) {
    switch (key) {
      case 'cash':
        return l10n.paymentCash;
      case 'card':
        return l10n.paymentCard;
      case 'deposit':
        return l10n.deposit;
      default:
        return key;
    }
  }

  static String _orderTypeLabel(String key, AppLocalizations l10n) {
    switch (key) {
      case 'dine_in':
        return l10n.dineIn;
      case 'takeaway':
      case 'pickup':
        return l10n.takeaway;
      case 'delivery':
        return l10n.deliveryOrder;
      default:
        return key;
    }
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: AppColors.shadowOf(context),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              AppSpacing.widthXs,
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
          AppSpacing.heightXs,
          Text(
            value,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: AppColors.shadowOf(context),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          AppSpacing.heightSm,
          child,
        ],
      ),
    );
  }
}

class _TrendChart extends StatelessWidget {
  final ReportData report;

  const _TrendChart({required this.report});

  @override
  Widget build(BuildContext context) {
    final spots = report.trend
        .asMap()
        .entries
        .map((e) => FlSpot(e.key.toDouble(), e.value))
        .toList();
    final labelStep = (report.trendLabels.length / 6).ceil().clamp(1, 10);

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (value) => FlLine(
            color: Theme.of(context).dividerColor.withValues(alpha: 0.3),
            strokeWidth: 1,
          ),
        ),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 42,
              getTitlesWidget: (value, meta) => Text(
                value >= 1000 ? '${(value / 1000).toStringAsFixed(1)}k' : _fmt(value),
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 24,
              interval: labelStep.toDouble(),
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index < 0 || index >= report.trendLabels.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    report.trendLabels[index],
                    style: const TextStyle(fontSize: 9, color: Colors.grey),
                  ),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            curveSmoothness: 0.3,
            color: AppColors.tealPrimary,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: FlDotData(show: report.trend.length <= 10),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.tealPrimary.withValues(alpha: 0.25),
                  AppColors.tealPrimary.withValues(alpha: 0.0),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BreakdownList extends StatelessWidget {
  final List<(String, String)> entries;

  const _BreakdownList({required this.entries});

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return const Text('—', style: TextStyle(color: Colors.grey));
    }
    return Column(
      children: entries
          .map(
            (entry) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      entry.$1,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  Text(
                    entry.$2,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.tealPrimary,
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}
