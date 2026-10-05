class CategoryModel {
  final String id;
  final String nameAr;
  final String? nameEn;
  final String? emoji;
  final String? imageUrl;
  final String? thumbnailUrl;
  final int sortOrder;
  final bool isAvailable;
  final bool isPopular;

  const CategoryModel({
    required this.id,
    required this.nameAr,
    this.nameEn,
    this.emoji,
    this.imageUrl,
    this.thumbnailUrl,
    this.sortOrder = 0,
    this.isAvailable = true,
    this.isPopular = false,
  });

  String localizedName(bool isArabic) =>
      isArabic ? nameAr : (nameEn?.isNotEmpty == true ? nameEn! : nameAr);

  CategoryModel copyWith({
    String? id,
    String? nameAr,
    String? nameEn,
    String? emoji,
    String? imageUrl,
    String? thumbnailUrl,
    int? sortOrder,
    bool? isAvailable,
    bool? isPopular,
  }) {
    return CategoryModel(
      id: id ?? this.id,
      nameAr: nameAr ?? this.nameAr,
      nameEn: nameEn ?? this.nameEn,
      emoji: emoji ?? this.emoji,
      imageUrl: imageUrl ?? this.imageUrl,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      sortOrder: sortOrder ?? this.sortOrder,
      isAvailable: isAvailable ?? this.isAvailable,
      isPopular: isPopular ?? this.isPopular,
    );
  }

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as String,
      nameAr: json['name_ar'] as String? ?? '',
      nameEn: json['name_en'] as String?,
      emoji: json['emoji'] as String?,
      imageUrl: json['image_url'] as String?,
      thumbnailUrl: json['thumbnail_url'] as String?,
      sortOrder: (json['sort_order'] as num? ?? 0).toInt(),
      isAvailable: json['is_available'] as bool? ?? true,
      isPopular: json['is_popular'] as bool? ?? false,
    );
  }
}
