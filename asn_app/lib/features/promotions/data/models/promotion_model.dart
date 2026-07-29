/// One item a promotion is tied to, stored inside the `required_items` jsonb.
/// Mirrors the web's RequiredItem so both dashboards read each other's data.
class PromotionItem {
  final String itemId;
  final String titleAr;
  final String? titleEn;
  final int qty;

  const PromotionItem({
    required this.itemId,
    required this.titleAr,
    this.titleEn,
    this.qty = 1,
  });

  factory PromotionItem.fromJson(Map<String, dynamic> json) => PromotionItem(
        itemId: json['item_id']?.toString() ?? '',
        titleAr: json['item_title_ar']?.toString() ?? '',
        titleEn: json['item_title_en']?.toString(),
        qty: (json['qty'] as num? ?? 1).toInt(),
      );

  Map<String, dynamic> toJson() => {
        'item_id': itemId,
        'item_title_ar': titleAr,
        'item_title_en': titleEn,
        'qty': qty,
      };
}

class PromotionModel {
  /// Marks a promotion as covering the whole menu instead of a fixed list.
  ///
  /// Kept inside `required_items` rather than as a new column so nothing about
  /// the table changes: an older client that does not know the marker simply
  /// fails to match it, which means "no discount" — never a surprise blanket
  /// discount. The web engine understands the same marker.
  static const String allItemsId = '__all_items__';

  static const String typeFixed = 'fixed_amount';
  static const String typePercentage = 'percentage';
  static const String typeFreeShipping = 'free_shipping';

  final String id;
  final String nameAr;
  final String? nameEn;
  final String? descriptionAr;
  final String? descriptionEn;
  final String discountType; // fixed_amount | percentage | free_shipping
  final double discountValue;

  /// Coupon code that unlocks this offer. Null means it applies automatically.
  final String? promoCode;
  final List<Map<String, dynamic>> requiredItems;
  final double? bundlePrice;
  final double minOrderAmount;
  final bool isActive;
  final DateTime? startsAt;
  final DateTime? endsAt;

  const PromotionModel({
    required this.id,
    required this.nameAr,
    this.nameEn,
    this.descriptionAr,
    this.descriptionEn,
    required this.discountType,
    required this.discountValue,
    this.promoCode,
    this.requiredItems = const [],
    this.bundlePrice,
    required this.minOrderAmount,
    this.isActive = true,
    this.startsAt,
    this.endsAt,
  });

  String localizedName(bool isArabic) =>
      isArabic ? nameAr : (nameEn?.isNotEmpty == true ? nameEn! : nameAr);

  bool get isExpired => endsAt != null && endsAt!.isBefore(DateTime.now());

  /// Applies to the whole menu, including items added after it was created.
  bool get appliesToAllItems =>
      requiredItems.any((i) => i['item_id']?.toString() == allItemsId);

  /// The real items this promotion is tied to, with the all-items marker
  /// filtered out so the UI never lists it as a product.
  List<PromotionItem> get items => requiredItems
      .where((i) => i['item_id']?.toString() != allItemsId)
      .map(PromotionItem.fromJson)
      .toList();

  /// A promotion with no target never fires — the engine skips it. Surfaced so
  /// the list can warn instead of leaving the user wondering why nothing
  /// happens at checkout.
  bool get hasNoTarget => !appliesToAllItems && items.isEmpty;

  /// Locked behind a coupon: it must never fire on its own, at the register or
  /// on the menu, until the code is entered.
  bool get requiresPromoCode => promoCode != null && promoCode!.trim().isNotEmpty;

  /// Codes match ignoring case and surrounding spaces, so a customer typing
  /// "save10" gets the offer created as "SAVE10".
  bool matchesCode(String? entered) =>
      requiresPromoCode &&
      entered != null &&
      entered.trim().toLowerCase() == promoCode!.trim().toLowerCase();

  factory PromotionModel.fromJson(Map<String, dynamic> json) {
    return PromotionModel(
      id: json['id'] as String,
      nameAr: json['name_ar'] as String,
      nameEn: json['name_en'] as String?,
      descriptionAr: json['description_ar'] as String?,
      descriptionEn: json['description_en'] as String?,
      discountType: json['discount_type'] as String? ?? 'fixed_amount',
      discountValue: (json['discount_value'] as num? ?? 0).toDouble(),
      promoCode: (json['promo_code'] as String?)?.trim().isNotEmpty == true
          ? (json['promo_code'] as String).trim()
          : null,
      requiredItems: (json['required_items'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .toList() ??
          const [],
      bundlePrice: (json['bundle_price'] as num?)?.toDouble(),
      minOrderAmount: (json['min_order_amount'] as num? ?? 0).toDouble(),
      isActive: json['is_active'] as bool? ?? true,
      startsAt: json['starts_at'] != null ? DateTime.tryParse(json['starts_at'] as String) : null,
      endsAt: json['ends_at'] != null ? DateTime.tryParse(json['ends_at'] as String) : null,
    );
  }
}
