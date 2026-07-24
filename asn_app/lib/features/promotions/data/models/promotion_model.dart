class PromotionModel {
  final String id;
  final String nameAr;
  final String? nameEn;
  final String? descriptionAr;
  final String? descriptionEn;
  final String discountType; // fixed_amount | percentage | free_shipping
  final double discountValue;
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

  factory PromotionModel.fromJson(Map<String, dynamic> json) {
    return PromotionModel(
      id: json['id'] as String,
      nameAr: json['name_ar'] as String,
      nameEn: json['name_en'] as String?,
      descriptionAr: json['description_ar'] as String?,
      descriptionEn: json['description_en'] as String?,
      discountType: json['discount_type'] as String? ?? 'fixed_amount',
      discountValue: (json['discount_value'] as num? ?? 0).toDouble(),
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
