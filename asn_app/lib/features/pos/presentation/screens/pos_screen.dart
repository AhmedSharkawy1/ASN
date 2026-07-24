import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/products/presentation/providers/products_provider.dart';
import 'package:asn_app/features/products/presentation/providers/categories_provider.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/pos/presentation/providers/pos_provider.dart';

String _fmt(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);

class POSScreen extends ConsumerStatefulWidget {
  const POSScreen({super.key});

  @override
  ConsumerState<POSScreen> createState() => _POSScreenState();
}

class _POSScreenState extends ConsumerState<POSScreen> {
  String _searchQuery = '';
  String? _selectedCategoryId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isWide = MediaQuery.of(context).size.width > 900;
    final cartState = ref.watch(cartNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.pos),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(productsNotifierProvider.notifier).refresh();
              ref.read(categoriesNotifierProvider.notifier).refresh();
            },
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: _buildProductsPane(context)),
          if (isWide) ...[
            const VerticalDivider(width: 1, thickness: 1),
            const SizedBox(width: 360, child: PosCartPanel()),
          ],
        ],
      ),
      // A floating cart pill (not a second bottom bar) so it coexists with
      // the app's bottom navigation instead of stacking on top of it.
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: isWide || cartState.items.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openCartSheet(context),
              backgroundColor: AppColors.tealPrimary,
              foregroundColor: Colors.white,
              icon: Badge(
                backgroundColor: Colors.white,
                textColor: AppColors.tealPrimary,
                label: Text('${cartState.itemCount}'),
                child: const Icon(Icons.shopping_cart_outlined),
              ),
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(l10n.viewCart, style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(width: 10),
                  Text(_fmt(cartState.total),
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                ],
              ),
            ),
    );
  }

  void _openCartSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (ctx2, scrollController) =>
            PosCartPanel(scrollController: scrollController),
      ),
    );
  }

  Widget _buildProductsPane(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final productsAsync = ref.watch(productsNotifierProvider);
    final categories = ref.watch(categoriesNotifierProvider).value ?? const [];

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, 0),
          child: TextField(
            onChanged: (value) => setState(() => _searchQuery = value),
            decoration: InputDecoration(
              hintText: l10n.searchHint,
              prefixIcon: const Icon(Icons.search, size: 22),
              isDense: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
              ),
            ),
          ),
        ),
        SizedBox(
          height: 50,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
            children: [
              Padding(
                padding: const EdgeInsetsDirectional.only(end: AppSpacing.xs),
                child: ChoiceChip(
                  label: Text(l10n.allCategories),
                  selected: _selectedCategoryId == null,
                  selectedColor: AppColors.tealPrimary.withValues(alpha: 0.15),
                  onSelected: (_) => setState(() => _selectedCategoryId = null),
                ),
              ),
              ...categories.map(
                (cat) => Padding(
                  padding: const EdgeInsetsDirectional.only(end: AppSpacing.xs),
                  child: ChoiceChip(
                    label: Text('${cat.emoji ?? ''} ${cat.localizedName(isArabic)}'.trim()),
                    selected: _selectedCategoryId == cat.id,
                    selectedColor: AppColors.tealPrimary.withValues(alpha: 0.15),
                    onSelected: (_) => setState(() => _selectedCategoryId = cat.id),
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: productsAsync.when(
            data: (products) {
              var available = products.where((p) => p.isAvailable).toList();
              if (_selectedCategoryId != null) {
                available = available.where((p) => p.categoryId == _selectedCategoryId).toList();
              }
              if (_searchQuery.isNotEmpty) {
                final q = _searchQuery.toLowerCase();
                available = available
                    .where((p) =>
                        p.titleAr.toLowerCase().contains(q) ||
                        (p.titleEn?.toLowerCase().contains(q) ?? false))
                    .toList();
              }

              if (available.isEmpty) {
                return AppEmptyState(icon: Icons.restaurant_menu, message: l10n.noProducts);
              }

              return GridView.builder(
                padding: const EdgeInsets.all(AppSpacing.md),
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 180,
                  childAspectRatio: 0.82,
                  crossAxisSpacing: AppSpacing.sm,
                  mainAxisSpacing: AppSpacing.sm,
                ),
                itemCount: available.length,
                itemBuilder: (context, index) => _POSProductCard(
                  product: available[index],
                  categoryName: categories
                      .where((c) => c.id == available[index].categoryId)
                      .map((c) => c.nameAr)
                      .firstOrNull,
                ),
              );
            },
            loading: () => const AppListSkeleton(itemHeight: 140),
            error: (err, stack) => AppErrorState(
              error: err,
              onRetry: () => ref.read(productsNotifierProvider.notifier).refresh(),
            ),
          ),
        ),
      ],
    );
  }
}

class _POSProductCard extends ConsumerWidget {
  final ProductModel product;
  final String? categoryName;

  const _POSProductCard({required this.product, this.categoryName});

  void _addToCart(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final notifier = ref.read(cartNotifierProvider.notifier);

    if (!product.hasMultipleSizes) {
      notifier.addItem(product, categoryName: categoryName);
      return;
    }

    // Multiple sizes: let the cashier pick one
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text('${l10n.chooseSize} — ${product.titleAr}',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ),
            const Divider(height: 1),
            ...product.sizes.map(
              (size) => ListTile(
                title: Text(size.label.isEmpty ? product.titleAr : size.label),
                trailing: Text(
                  _fmt(size.price),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: AppColors.tealPrimary,
                    fontSize: 15,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  notifier.addItem(product, size: size, categoryName: categoryName);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    return InkWell(
      onTap: () => _addToCart(context, ref),
      borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          border: Border.all(color: AppColors.tealPrimary.withValues(alpha: 0.12), width: 1.5),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 2,
              child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: product.imageUrl!,
                      fit: BoxFit.cover,
                      errorWidget: (context, url, error) =>
                          const Icon(Icons.fastfood, color: Colors.grey, size: 36),
                    )
                  : const Icon(Icons.fastfood, color: Colors.grey, size: 36),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xs, vertical: AppSpacing.xxs),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      product.titleAr,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    Text(
                      product.hasMultipleSizes
                          ? '${l10n.priceFrom} ${_fmt(product.minPrice)}'
                          : _fmt(product.price),
                      style: const TextStyle(
                        color: AppColors.tealPrimary,
                        fontWeight: FontWeight.w900,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The cart: used as a side panel on wide screens and inside a bottom
/// sheet on phones.
class PosCartPanel extends ConsumerWidget {
  final ScrollController? scrollController;

  const PosCartPanel({super.key, this.scrollController});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final cartState = ref.watch(cartNotifierProvider);
    final cartNotifier = ref.read(cartNotifierProvider.notifier);

    return Container(
      color: Theme.of(context).cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
            color: AppColors.tealPrimary.withValues(alpha: 0.08),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(l10n.currentOrder,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                IconButton(
                  tooltip: l10n.clearCart,
                  icon: const Icon(Icons.delete_outline, color: AppColors.error),
                  onPressed: cartState.items.isEmpty ? null : () => cartNotifier.clearCart(),
                ),
              ],
            ),
          ),

          // Items + options
          Expanded(
            child: cartState.items.isEmpty
                ? Center(
                    child: Text(l10n.cartEmpty, style: const TextStyle(color: Colors.grey)))
                : ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    children: [
                      ...cartState.items.map((item) => _CartItemRow(item: item)),
                      const Divider(height: AppSpacing.lg),

                      // Order type
                      Text(l10n.orderTypeLabel,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      AppSpacing.heightXs,
                      SegmentedButton<PosOrderType>(
                        segments: [
                          ButtonSegment(
                            value: PosOrderType.dineIn,
                            label: Text(l10n.dineIn, style: const TextStyle(fontSize: 11)),
                            icon: const Icon(Icons.restaurant, size: 14),
                          ),
                          ButtonSegment(
                            value: PosOrderType.takeaway,
                            label: Text(l10n.takeaway, style: const TextStyle(fontSize: 11)),
                            icon: const Icon(Icons.takeout_dining, size: 14),
                          ),
                          ButtonSegment(
                            value: PosOrderType.delivery,
                            label: Text(l10n.deliveryOrder, style: const TextStyle(fontSize: 11)),
                            icon: const Icon(Icons.delivery_dining, size: 14),
                          ),
                        ],
                        selected: {cartState.orderType},
                        onSelectionChanged: (selection) =>
                            cartNotifier.setOrderType(selection.first),
                        showSelectedIcon: false,
                      ),
                      AppSpacing.heightSm,

                      // Customer info + notes
                      _CustomerInfoTile(cartState: cartState),

                      // Discount
                      _DiscountTile(cartState: cartState),

                      // Payment method
                      _PaymentTile(cartState: cartState),
                    ],
                  ),
          ),

          // Totals + checkout
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              children: [
                _SummaryRow(title: l10n.subtotal, value: cartState.subtotal),
                if (cartState.discount > 0)
                  _SummaryRow(title: l10n.discount, value: -cartState.discount),
                if (cartState.orderType == PosOrderType.delivery && cartState.deliveryFee > 0)
                  _SummaryRow(title: l10n.deliveryFee, value: cartState.deliveryFee),
                const Divider(height: AppSpacing.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(l10n.total,
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                    Text(
                      _fmt(cartState.total),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 22,
                        color: AppColors.tealPrimary,
                      ),
                    ),
                  ],
                ),
                AppSpacing.heightSm,
                ElevatedButton(
                  onPressed: cartState.items.isEmpty || cartState.isCheckingOut
                      ? null
                      : () async {
                          final navigator = Navigator.of(context);
                          final isSheet = scrollController != null;
                          try {
                            await ref.read(cartNotifierProvider.notifier).checkout();
                            if (context.mounted) {
                              showAppSnackBar(context, l10n.orderPlaced,
                                  type: AppSnackBarType.success);
                              if (isSheet) navigator.pop();
                            }
                          } catch (e) {
                            if (context.mounted) {
                              showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                  child: cartState.isCheckingOut
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          l10n.checkout,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CartItemRow extends ConsumerWidget {
  final CartItem item;

  const _CartItemRow({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartNotifier = ref.read(cartNotifierProvider.notifier);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.product.titleAr,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                Text(
                  '${item.size.label.isNotEmpty ? '${item.size.label} • ' : ''}${_fmt(item.size.price)}',
                  style: const TextStyle(color: Colors.grey, fontSize: 11),
                ),
              ],
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.remove_circle_outline, color: AppColors.warning, size: 22),
            onPressed: () => cartNotifier.updateQuantity(item.key, item.quantity - 1),
          ),
          Text('${item.quantity}',
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.add_circle_outline, color: AppColors.success, size: 22),
            onPressed: () => cartNotifier.updateQuantity(item.key, item.quantity + 1),
          ),
          SizedBox(
            width: 56,
            child: Text(
              _fmt(item.totalPrice),
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _CustomerInfoTile extends ConsumerWidget {
  final CartState cartState;

  const _CustomerInfoTile({required this.cartState});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final hasInfo = (cartState.customerName?.isNotEmpty ?? false) ||
        (cartState.customerPhone?.isNotEmpty ?? false);

    return ListTile(
      contentPadding: EdgeInsets.zero,
      dense: true,
      leading: const AppIconBadgeSmall(icon: Icons.person_outline, color: AppColors.info),
      title: Text(l10n.customerInfo,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
      subtitle: hasInfo
          ? Text(
              [cartState.customerName, cartState.customerPhone]
                  .where((s) => s?.isNotEmpty ?? false)
                  .join(' • '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11),
            )
          : null,
      trailing: const Icon(Icons.chevron_right, size: 18),
      onTap: () => _showDialog(context, ref, l10n),
    );
  }

  void _showDialog(BuildContext context, WidgetRef ref, AppLocalizations l10n) {
    final nameController = TextEditingController(text: cartState.customerName ?? '');
    final phoneController = TextEditingController(text: cartState.customerPhone ?? '');
    final addressController = TextEditingController(text: cartState.customerAddress ?? '');
    final notesController = TextEditingController(text: cartState.notes ?? '');
    final feeController = TextEditingController(
        text: cartState.deliveryFee > 0 ? _fmt(cartState.deliveryFee) : '');
    final isDelivery = cartState.orderType == PosOrderType.delivery;

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.customerInfo),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: InputDecoration(labelText: l10n.customerName),
              ),
              AppSpacing.heightSm,
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(labelText: l10n.customerPhone),
              ),
              if (isDelivery) ...[
                AppSpacing.heightSm,
                TextField(
                  controller: addressController,
                  decoration: InputDecoration(labelText: l10n.customerAddress),
                ),
                AppSpacing.heightSm,
                TextField(
                  controller: feeController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: l10n.deliveryFee),
                ),
              ],
              AppSpacing.heightSm,
              TextField(
                controller: notesController,
                decoration: InputDecoration(labelText: l10n.notes),
                maxLines: 2,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.cancel)),
          ElevatedButton(
            onPressed: () {
              final notifier = ref.read(cartNotifierProvider.notifier);
              notifier.setCustomer(
                name: nameController.text.trim(),
                phone: phoneController.text.trim(),
                address: addressController.text.trim(),
                notes: notesController.text.trim(),
              );
              if (isDelivery) {
                notifier.setDeliveryFee(double.tryParse(feeController.text.trim()) ?? 0);
              }
              Navigator.pop(ctx);
            },
            child: Text(l10n.save),
          ),
        ],
      ),
    );
  }
}

class _DiscountTile extends ConsumerWidget {
  final CartState cartState;

  const _DiscountTile({required this.cartState});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    return ListTile(
      contentPadding: EdgeInsets.zero,
      dense: true,
      leading: const AppIconBadgeSmall(icon: Icons.percent, color: AppColors.warning),
      title: Text(l10n.discount,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
      subtitle: cartState.discountValue > 0
          ? Text(
              cartState.discountIsPercent
                  ? '${_fmt(cartState.discountValue)}%'
                  : _fmt(cartState.discountValue),
              style: const TextStyle(fontSize: 11),
            )
          : null,
      trailing: const Icon(Icons.chevron_right, size: 18),
      onTap: () {
        final valueController = TextEditingController(
            text: cartState.discountValue > 0 ? _fmt(cartState.discountValue) : '');
        bool isPercent = cartState.discountIsPercent;

        showDialog<void>(
          context: context,
          builder: (ctx) => StatefulBuilder(
            builder: (ctx2, setState) => AlertDialog(
              title: Text(l10n.discount),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SegmentedButton<bool>(
                    segments: [
                      ButtonSegment(value: false, label: Text(l10n.fixedAmount)),
                      ButtonSegment(value: true, label: Text(l10n.percentage)),
                    ],
                    selected: {isPercent},
                    onSelectionChanged: (sel) => setState(() => isPercent = sel.first),
                    showSelectedIcon: false,
                  ),
                  AppSpacing.heightSm,
                  TextField(
                    controller: valueController,
                    autofocus: true,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: l10n.discountValue),
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx2), child: Text(l10n.cancel)),
                ElevatedButton(
                  onPressed: () {
                    ref.read(cartNotifierProvider.notifier).setDiscount(
                          double.tryParse(valueController.text.trim()) ?? 0,
                          isPercent: isPercent,
                        );
                    Navigator.pop(ctx2);
                  },
                  child: Text(l10n.save),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _PaymentTile extends ConsumerWidget {
  final CartState cartState;

  const _PaymentTile({required this.cartState});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final notifier = ref.read(cartNotifierProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppSpacing.heightXs,
        Text(l10n.paymentMethod,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        AppSpacing.heightXs,
        SegmentedButton<String>(
          segments: [
            ButtonSegment(
              value: 'cash',
              label: Text(l10n.paymentCash, style: const TextStyle(fontSize: 12)),
              icon: const Icon(Icons.payments_outlined, size: 15),
            ),
            ButtonSegment(
              value: 'deposit',
              label: Text(l10n.deposit, style: const TextStyle(fontSize: 12)),
              icon: const Icon(Icons.receipt_long_outlined, size: 15),
            ),
          ],
          selected: {cartState.paymentMethod},
          onSelectionChanged: (selection) => notifier.setPayment(
            selection.first,
            depositAmount: cartState.depositAmount,
          ),
          showSelectedIcon: false,
        ),
        if (cartState.paymentMethod == 'deposit') ...[
          AppSpacing.heightSm,
          TextFormField(
            initialValue: cartState.depositAmount > 0 ? _fmt(cartState.depositAmount) : '',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: l10n.depositAmount, isDense: true),
            onChanged: (v) =>
                notifier.setPayment('deposit', depositAmount: double.tryParse(v.trim()) ?? 0),
          ),
        ],
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String title;
  final double value;

  const _SummaryRow({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          Text(_fmt(value), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}

/// Compact icon badge for dense list tiles.
class AppIconBadgeSmall extends StatelessWidget {
  final IconData icon;
  final Color color;

  const AppIconBadgeSmall({super.key, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 14,
      backgroundColor: color.withValues(alpha: 0.12),
      child: Icon(icon, color: color, size: 15),
    );
  }
}
