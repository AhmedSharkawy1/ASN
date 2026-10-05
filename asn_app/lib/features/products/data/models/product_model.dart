/// One size/price variant. The web platform encodes an optional pre-discount
/// price into the label as `label::oldPrice` inside items.size_labels.
class ProductSize {
  final String label;
  final double price;
  final double? oldPrice;

  const ProductSize({required this.label, required this.price, this.oldPrice});

  bool get hasDiscount => oldPrice != null && oldPrice! > price;
}

/// Maps the real `items` table: title_ar/title_en, desc_ar/desc_en,
/// price + prices[] (per-size), size_labels[], badges, sell_by_weight and image_url.
class ProductModel {
  final String id;
  final String titleAr;
  final String? titleEn;
  final String? descAr;
  final String? descEn;
  final double price;
  final List<double> prices;
  final List<String> rawSizeLabels;
  final String? imageUrl;
  final String? thumbnailUrl;
  final bool isAvailable;
  final bool isPopular;
  final bool isSpicy;
  final bool isNew;
  final bool sellByWeight;
  final String? weightUnit;
  final String? categoryId;
  final int sortOrder;

  const ProductModel({
    required this.id,
    required this.titleAr,
    this.titleEn,
    this.descAr,
    this.descEn,
    required this.price,
    this.prices = const [],
    this.rawSizeLabels = const [],
    this.imageUrl,
    this.thumbnailUrl,
    this.isAvailable = true,
    this.isPopular = false,
    this.isSpicy = false,
    this.isNew = false,
    this.sellByWeight = false,
    this.weightUnit,
    this.categoryId,
    this.sortOrder = 0,
  });

  /// Arabic-first display name (data entry on the platform is Arabic-first).
  String get name => titleAr.isNotEmpty ? titleAr : (titleEn ?? '');

  String? get description => descAr?.isNotEmpty == true ? descAr : descEn;

  String localizedName(bool isArabic) =>
      isArabic ? name : (titleEn?.isNotEmpty == true ? titleEn! : name);

  /// Decoded size variants pairing prices[] with size_labels[].
  List<ProductSize> get sizes {
    if (prices.isEmpty) {
      return [ProductSize(label: '', price: price)];
    }
    return List.generate(prices.length, (i) {
      final raw = i < rawSizeLabels.length ? rawSizeLabels[i] : '';
      final parts = raw.split('::');
      final label = parts.first;
      final oldPrice = parts.length > 1 ? double.tryParse(parts[1]) : null;
      return ProductSize(label: label, price: prices[i], oldPrice: oldPrice);
    });
  }

  double get minPrice =>
      prices.isEmpty ? price : prices.reduce((a, b) => a < b ? a : b);

  bool get hasMultipleSizes => prices.length > 1;

  bool get hasDiscount => sizes.any((s) => s.hasDiscount);

  ProductModel copyWith({
    String? id,
    String? titleAr,
    String? titleEn,
    String? descAr,
    String? descEn,
    double? price,
    List<double>? prices,
    List<String>? rawSizeLabels,
    String? imageUrl,
    String? thumbnailUrl,
    bool? isAvailable,
    bool? isPopular,
    bool? isSpicy,
    bool? isNew,
    bool? sellByWeight,
    String? weightUnit,
    String? categoryId,
    int? sortOrder,
  }) {
    return ProductModel(
      id: id ?? this.id,
      titleAr: titleAr ?? this.titleAr,
      titleEn: titleEn ?? this.titleEn,
      descAr: descAr ?? this.descAr,
      descEn: descEn ?? this.descEn,
      price: price ?? this.price,
      prices: prices ?? this.prices,
      rawSizeLabels: rawSizeLabels ?? this.rawSizeLabels,
      imageUrl: imageUrl ?? this.imageUrl,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      isAvailable: isAvailable ?? this.isAvailable,
      isPopular: isPopular ?? this.isPopular,
      isSpicy: isSpicy ?? this.isSpicy,
      isNew: isNew ?? this.isNew,
      sellByWeight: sellByWeight ?? this.sellByWeight,
      weightUnit: weightUnit ?? this.weightUnit,
      categoryId: categoryId ?? this.categoryId,
      sortOrder: sortOrder ?? this.sortOrder,
    );
  }

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final prices = (json['prices'] as List?)
            ?.whereType<num>()
            .map((p) => p.toDouble())
            .toList() ??
        const <double>[];
    final basePrice = (json['price'] as num?)?.toDouble() ??
        (prices.isNotEmpty ? prices.first : 0.0);

    return ProductModel(
      id: json['id'] as String,
      titleAr: json['title_ar'] as String? ?? '',
      titleEn: json['title_en'] as String?,
      descAr: json['desc_ar'] as String?,
      descEn: json['desc_en'] as String?,
      price: basePrice,
      prices: prices,
      rawSizeLabels:
          (json['size_labels'] as List?)?.map((l) => l?.toString() ?? '').toList() ?? const [],
      imageUrl: json['image_url'] as String?,
      thumbnailUrl: json['thumbnail_url'] as String?,
      isAvailable: json['is_available'] as bool? ?? true,
      isPopular: json['is_popular'] as bool? ?? false,
      isSpicy: json['is_spicy'] as bool? ?? false,
      isNew: json['is_new'] as bool? ?? false,
      sellByWeight: json['sell_by_weight'] as bool? ?? false,
      weightUnit: json['weight_unit'] as String?,
      categoryId: json['category_id'] as String?,
      sortOrder: (json['sort_order'] as num? ?? 0).toInt(),
    );
  }
}
