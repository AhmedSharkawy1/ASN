class DeliveryZoneModel {
  final String id;
  final String nameAr;
  final String? nameEn;
  final double fee;
  final double minOrder;
  final int estimatedTime;
  final bool isActive;

  const DeliveryZoneModel({
    required this.id,
    required this.nameAr,
    this.nameEn,
    required this.fee,
    required this.minOrder,
    required this.estimatedTime,
    this.isActive = true,
  });

  String localizedName(bool isArabic) =>
      isArabic ? nameAr : (nameEn?.isNotEmpty == true ? nameEn! : nameAr);

  factory DeliveryZoneModel.fromJson(Map<String, dynamic> json) {
    return DeliveryZoneModel(
      id: json['id'] as String,
      nameAr: json['name_ar'] as String,
      nameEn: json['name_en'] as String?,
      fee: (json['fee'] as num? ?? 0).toDouble(),
      minOrder: (json['min_order'] as num? ?? 0).toDouble(),
      estimatedTime: (json['estimated_time'] as num? ?? 30).toInt(),
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
