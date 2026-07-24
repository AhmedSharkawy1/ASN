class CategoryModel {
  final String id;
  final String nameAr;
  final String? nameEn;
  final String? emoji;
  final String? imageUrl;
  final int sortOrder;

  const CategoryModel({
    required this.id,
    required this.nameAr,
    this.nameEn,
    this.emoji,
    this.imageUrl,
    this.sortOrder = 0,
  });

  String localizedName(bool isArabic) =>
      isArabic ? nameAr : (nameEn?.isNotEmpty == true ? nameEn! : nameAr);

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as String,
      nameAr: json['name_ar'] as String? ?? '',
      nameEn: json['name_en'] as String?,
      emoji: json['emoji'] as String?,
      imageUrl: json['image_url'] as String?,
      sortOrder: (json['sort_order'] as num? ?? 0).toInt(),
    );
  }
}
