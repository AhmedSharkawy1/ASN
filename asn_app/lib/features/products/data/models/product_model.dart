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
/// price + prices[] (per-size), size_labels[], badges and image_url.
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
  final bool isAvailable;
  final bool isPopular;
  final bool isSpicy;
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
    this.isAvailable = true,
    this.isPopular = false,
    this.isSpicy = false,
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
      isAvailable: json['is_available'] as bool? ?? true,
      isPopular: json['is_popular'] as bool? ?? false,
      isSpicy: json['is_spicy'] as bool? ?? false,
      categoryId: json['category_id'] as String?,
      sortOrder: (json['sort_order'] as num? ?? 0).toInt(),
    );
  }
}
