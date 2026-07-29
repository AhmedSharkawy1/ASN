import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/products/presentation/providers/products_provider.dart';
import 'package:asn_app/features/products/presentation/providers/categories_provider.dart';
import 'package:asn_app/features/promotions/data/models/promotion_model.dart';
import 'package:asn_app/features/promotions/presentation/providers/promotions_provider.dart';

/// Create or edit an offer. [promo] null means create.
Future<void> showPromotionEditor(BuildContext context, {PromotionModel? promo}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => PromotionEditorSheet(promo: promo),
  );
}

class PromotionEditorSheet extends ConsumerStatefulWidget {
  final PromotionModel? promo;

  const PromotionEditorSheet({super.key, this.promo});

  @override
  ConsumerState<PromotionEditorSheet> createState() => _PromotionEditorSheetState();
}

class _PromotionEditorSheetState extends ConsumerState<PromotionEditorSheet> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameAr;
  late final TextEditingController _nameEn;
  late final TextEditingController _description;
  late final TextEditingController _value;
  late final TextEditingController _minOrder;

  late final TextEditingController _promoCode;

  late String _type;
  late bool _requiresCode;
  late bool _allItems;
  late Map<String, PromotionItem> _selected;
  DateTime? _startsAt;
  DateTime? _endsAt;
  bool _saving = false;

  bool get _isEdit => widget.promo != null;

  @override
  void initState() {
    super.initState();
    final p = widget.promo;
    _nameAr = TextEditingController(text: p?.nameAr ?? '');
    _nameEn = TextEditingController(text: p?.nameEn ?? '');
    _description = TextEditingController(text: p?.descriptionAr ?? '');
    _value = TextEditingController(
      text: p == null || p.discountValue == 0 ? '' : _trimZeros(p.discountValue),
    );
    _minOrder = TextEditingController(
      text: p == null || p.minOrderAmount == 0 ? '' : _trimZeros(p.minOrderAmount),
    );
    _promoCode = TextEditingController(text: p?.promoCode ?? '');
    _type = p?.discountType ?? PromotionModel.typePercentage;
    _requiresCode = p?.requiresPromoCode ?? false;
    _allItems = p?.appliesToAllItems ?? true;
    _selected = {for (final i in p?.items ?? const <PromotionItem>[]) i.itemId: i};
    _startsAt = p?.startsAt;
    _endsAt = p?.endsAt;
  }

  static String _trimZeros(double v) =>
      v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();

  @override
  void dispose() {
    _nameAr.dispose();
    _nameEn.dispose();
    _description.dispose();
    _value.dispose();
    _minOrder.dispose();
    _promoCode.dispose();
    super.dispose();
  }

  /// Free shipping has no amount of its own — it waives the delivery fee.
  bool get _needsValue => _type != PromotionModel.typeFreeShipping;

  Future<void> _pickDate({required bool isStart}) async {
    final initial = (isStart ? _startsAt : _endsAt) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _startsAt = picked;
      } else {
        _endsAt = picked;
      }
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_allItems && _selected.isEmpty) {
      showAppSnackBar(context, 'اختر صنفاً واحداً على الأقل، أو فعّل "كل الأصناف"',
          type: AppSnackBarType.error);
      return;
    }
    if (_startsAt != null && _endsAt != null && _endsAt!.isBefore(_startsAt!)) {
      showAppSnackBar(context, 'تاريخ الانتهاء قبل تاريخ البداية',
          type: AppSnackBarType.error);
      return;
    }

    setState(() => _saving = true);
    final notifier = ref.read(promotionsNotifierProvider.notifier);
    final value = _needsValue ? (double.tryParse(_value.text.trim()) ?? 0) : 0.0;
    final minOrder = double.tryParse(_minOrder.text.trim()) ?? 0;
    final items = _selected.values.toList();

    try {
      if (_isEdit) {
        await notifier.updatePromotion(
          promoId: widget.promo!.id,
          nameAr: _nameAr.text.trim(),
          nameEn: _nameEn.text.trim().isEmpty ? null : _nameEn.text.trim(),
          descriptionAr: _description.text.trim().isEmpty ? null : _description.text.trim(),
          discountType: _type,
          discountValue: value,
          minOrderAmount: minOrder,
          appliesToAllItems: _allItems,
          items: items,
          promoCode: _requiresCode ? _promoCode.text.trim() : null,
          startsAt: _startsAt,
          endsAt: _endsAt,
        );
      } else {
        await notifier.addPromotion(
          nameAr: _nameAr.text.trim(),
          nameEn: _nameEn.text.trim().isEmpty ? null : _nameEn.text.trim(),
          descriptionAr: _description.text.trim().isEmpty ? null : _description.text.trim(),
          discountType: _type,
          discountValue: value,
          minOrderAmount: minOrder,
          appliesToAllItems: _allItems,
          items: items,
          promoCode: _requiresCode ? _promoCode.text.trim() : null,
          startsAt: _startsAt,
          endsAt: _endsAt,
        );
      }
      if (!mounted) return;
      Navigator.pop(context);
      showAppSnackBar(context, _isEdit ? 'تم تعديل العرض' : 'تم إنشاء العرض',
          type: AppSnackBarType.success);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      showAppSnackBar(context, '$e', type: AppSnackBarType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.92,
      minChildSize: 0.5,
      maxChildSize: 0.96,
      builder: (context, scrollController) => Container(
        decoration: BoxDecoration(
          color: theme.scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
        ),
        child: Column(
          children: [
            _grabber(theme),
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md, 0, AppSpacing.md, AppSpacing.md),
                  children: [
                    _sectionTitle('نوع العرض'),
                    _typeSelector(),
                    AppSpacing.heightMd,

                    _sectionTitle('البيانات'),
                    TextFormField(
                      controller: _nameAr,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'اسم العرض *',
                        hintText: 'مثال: خصم الويك إند',
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'اكتب اسم العرض' : null,
                    ),
                    AppSpacing.heightXs,
                    TextFormField(
                      controller: _nameEn,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(labelText: 'الاسم بالإنجليزية (اختياري)'),
                    ),
                    AppSpacing.heightXs,
                    TextFormField(
                      controller: _description,
                      maxLines: 2,
                      decoration: const InputDecoration(labelText: 'وصف مختصر (اختياري)'),
                    ),
                    AppSpacing.heightMd,

                    _sectionTitle('القيمة'),
                    if (_needsValue) ...[
                      TextFormField(
                        controller: _value,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                        ],
                        decoration: InputDecoration(
                          labelText: _type == PromotionModel.typePercentage
                              ? 'نسبة الخصم *'
                              : 'قيمة الخصم *',
                          suffixText: _type == PromotionModel.typePercentage ? '%' : 'ج',
                        ),
                        validator: (v) {
                          final n = double.tryParse((v ?? '').trim());
                          if (n == null || n <= 0) return 'اكتب قيمة أكبر من صفر';
                          if (_type == PromotionModel.typePercentage && n > 100) {
                            return 'النسبة لا تزيد عن 100%';
                          }
                          return null;
                        },
                      ),
                      AppSpacing.heightXs,
                    ] else
                      _infoBox('العميل لن يدفع رسوم التوصيل عند تحقق شروط العرض.'),
                    TextFormField(
                      controller: _minOrder,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                      decoration: const InputDecoration(
                        labelText: 'أقل قيمة للطلب (اختياري)',
                        helperText: 'اتركه فارغاً لتطبيق العرض على أي طلب',
                        suffixText: 'ج',
                      ),
                    ),
                    AppSpacing.heightMd,

                    _sectionTitle('يطبّق على'),
                    _targetSelector(),
                    if (!_allItems) ...[
                      AppSpacing.heightXs,
                      _itemPicker(),
                    ],
                    AppSpacing.heightMd,

                    _sectionTitle('كود الخصم'),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      value: _requiresCode,
                      onChanged: (v) => setState(() => _requiresCode = v),
                      title: const Text('يتطلب كود',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      subtitle: Text(
                        _requiresCode
                            ? 'العرض لا يُطبَّق إلا لو كتب العميل الكود'
                            : 'العرض يُطبَّق تلقائياً بدون كود',
                        style: const TextStyle(fontSize: 11.5),
                      ),
                    ),
                    if (_requiresCode)
                      TextFormField(
                        controller: _promoCode,
                        textCapitalization: TextCapitalization.characters,
                        inputFormatters: [
                          // A code the customer has to type: no spaces to get
                          // wrong, and matching is case-insensitive anyway.
                          FilteringTextInputFormatter.deny(RegExp(r'\s')),
                          LengthLimitingTextInputFormatter(24),
                        ],
                        decoration: const InputDecoration(
                          labelText: 'الكود *',
                          hintText: 'SAVE10',
                          helperText: 'حروف وأرقام بدون مسافات — الكبتال مش فارق',
                        ),
                        validator: (v) {
                          if (!_requiresCode) return null;
                          final code = (v ?? '').trim();
                          if (code.isEmpty) return 'اكتب الكود أو أوقف الخيار';
                          if (code.length < 3) return 'الكود قصير جداً';
                          return null;
                        },
                      ),
                    AppSpacing.heightMd,

                    _sectionTitle('المدة (اختياري)'),
                    Row(
                      children: [
                        Expanded(child: _dateField(isStart: true)),
                        AppSpacing.widthSm,
                        Expanded(child: _dateField(isStart: false)),
                      ],
                    ),
                    AppSpacing.heightLg,
                  ],
                ),
              ),
            ),
            _saveBar(),
          ],
        ),
      ),
    );
  }

  Widget _grabber(ThemeData theme) => Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.dividerColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            AppSpacing.heightSm,
            Text(
              _isEdit ? 'تعديل العرض' : 'عرض جديد',
              style: theme.textTheme.titleLarge,
            ),
          ],
        ),
      );

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.xs, top: AppSpacing.xs),
        child: Text(
          text,
          style: Theme.of(context)
              .textTheme
              .labelLarge
              ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      );

  Widget _infoBox(String text) => Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.steelBlue.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline, size: 18, color: AppColors.steelBlue),
            AppSpacing.widthXs,
            Expanded(child: Text(text, style: const TextStyle(fontSize: 12))),
          ],
        ),
      );

  Widget _typeSelector() {
    const options = [
      (PromotionModel.typePercentage, 'خصم بنسبة', Icons.percent),
      (PromotionModel.typeFixed, 'خصم ثابت', Icons.payments_outlined),
      (PromotionModel.typeFreeShipping, 'شحن مجاني', Icons.local_shipping_outlined),
    ];

    return Row(
      children: [
        for (final (value, label, icon) in options) ...[
          Expanded(
            child: _choiceCard(
              selected: _type == value,
              icon: icon,
              label: label,
              onTap: () => setState(() => _type = value),
            ),
          ),
          if (value != options.last.$1) AppSpacing.widthXs,
        ],
      ],
    );
  }

  Widget _targetSelector() => Row(
        children: [
          Expanded(
            child: _choiceCard(
              selected: _allItems,
              icon: Icons.select_all,
              label: 'كل الأصناف',
              onTap: () => setState(() => _allItems = true),
            ),
          ),
          AppSpacing.widthXs,
          Expanded(
            child: _choiceCard(
              selected: !_allItems,
              icon: Icons.checklist,
              label: _selected.isEmpty
                  ? 'أصناف معيّنة'
                  : 'أصناف معيّنة (${_selected.length})',
              onTap: () => setState(() => _allItems = false),
            ),
          ),
        ],
      );

  Widget _choiceCard({
    required bool selected,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(
            vertical: AppSpacing.sm, horizontal: AppSpacing.xs),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.steelBlue.withValues(alpha: 0.12)
              : theme.cardColor,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(
            color: selected ? AppColors.steelBlue : theme.dividerColor,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon,
                size: 22,
                color: selected ? AppColors.steelBlue : theme.colorScheme.onSurfaceVariant),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? AppColors.steelBlue : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dateField({required bool isStart}) {
    final value = isStart ? _startsAt : _endsAt;
    final label = isStart ? 'يبدأ' : 'ينتهي';
    return InkWell(
      onTap: () => _pickDate(isStart: isStart),
      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: value == null
              ? const Icon(Icons.calendar_today_outlined, size: 18)
              : IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: () => setState(() {
                    if (isStart) {
                      _startsAt = null;
                    } else {
                      _endsAt = null;
                    }
                  }),
                ),
        ),
        child: Text(
          value == null ? 'غير محدد' : DateFormat('yyyy/MM/dd').format(value),
          style: TextStyle(color: value == null ? Colors.grey : null),
        ),
      ),
    );
  }

  Widget _itemPicker() {
    final productsAsync = ref.watch(productsNotifierProvider);
    final categoriesAsync = ref.watch(categoriesNotifierProvider);

    return productsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(AppSpacing.md),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => _infoBox('تعذّر تحميل الأصناف: $e'),
      data: (products) {
        if (products.isEmpty) {
          return _infoBox('لا توجد أصناف بعد — أضف أصنافاً من صفحة المنتجات أولاً.');
        }
        final categories = categoriesAsync.value ?? const [];
        final names = {for (final c in categories) c.id: c.nameAr};

        // Keep the menu's own grouping; anything without a category lands last.
        final grouped = <String, List<ProductModel>>{};
        for (final p in products) {
          grouped.putIfAbsent(p.categoryId ?? '', () => []).add(p);
        }
        final orderedKeys = [
          for (final c in categories)
            if (grouped.containsKey(c.id)) c.id,
          if (grouped.containsKey('')) '',
        ];

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'المحدد: ${_selected.length} من ${products.length}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
                if (_selected.isNotEmpty)
                  TextButton(
                    onPressed: () => setState(_selected.clear),
                    child: const Text('مسح الكل'),
                  ),
              ],
            ),
            for (final key in orderedKeys)
              _categoryGroup(
                title: key.isEmpty ? 'بدون قسم' : (names[key] ?? 'قسم'),
                items: grouped[key]!,
              ),
          ],
        );
      },
    );
  }

  Widget _categoryGroup({required String title, required List<ProductModel> items}) {
    final allSelected = items.every((p) => _selected.containsKey(p.id));
    final someSelected = !allSelected && items.any((p) => _selected.containsKey(p.id));

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
        shape: const Border(),
        title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        subtitle: Text(
          '${items.where((p) => _selected.containsKey(p.id)).length} / ${items.length}',
          style: const TextStyle(fontSize: 11),
        ),
        trailing: Checkbox(
          value: allSelected ? true : (someSelected ? null : false),
          tristate: true,
          onChanged: (_) => setState(() {
            if (allSelected) {
              for (final p in items) {
                _selected.remove(p.id);
              }
            } else {
              for (final p in items) {
                _selected[p.id] = _toPromotionItem(p);
              }
            }
          }),
        ),
        children: [
          for (final p in items)
            CheckboxListTile(
              dense: true,
              value: _selected.containsKey(p.id),
              title: Text(p.titleAr, style: const TextStyle(fontSize: 13)),
              onChanged: (checked) => setState(() {
                if (checked == true) {
                  _selected[p.id] = _toPromotionItem(p);
                } else {
                  _selected.remove(p.id);
                }
              }),
            ),
        ],
      ),
    );
  }

  /// Titles are copied into the promotion so the checkout summary can name the
  /// item without a second lookup — the same shape the web dashboard writes.
  PromotionItem _toPromotionItem(ProductModel p) => PromotionItem(
        itemId: p.id,
        titleAr: p.titleAr,
        titleEn: p.titleEn,
      );

  Widget _saveBar() => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : () => Navigator.pop(context),
                  child: const Text('إلغاء'),
                ),
              ),
              AppSpacing.widthSm,
              Expanded(
                flex: 2,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(_isEdit ? 'حفظ التعديلات' : 'إنشاء العرض'),
                ),
              ),
            ],
          ),
        ),
      );
}
