class InventoryItemModel {
  final String id;
  final String name;
  final double quantity;
  final String unit;
  final double minimumStock;
  final String itemType;
  final double costPerUnit;
  final String currency;
  final String? supplier;
  final String? category;
  final bool isActive;
  final DateTime? expiryDate;

  const InventoryItemModel({
    required this.id,
    required this.name,
    required this.quantity,
    required this.unit,
    required this.minimumStock,
    required this.itemType,
    required this.costPerUnit,
    required this.currency,
    this.supplier,
    this.category,
    this.isActive = true,
    this.expiryDate,
  });

  bool get isLowStock => quantity <= minimumStock;

  factory InventoryItemModel.fromJson(Map<String, dynamic> json) {
    return InventoryItemModel(
      id: json['id'] as String,
      name: json['name'] as String,
      quantity: (json['quantity'] as num? ?? 0).toDouble(),
      unit: json['unit'] as String? ?? 'kg',
      minimumStock: (json['minimum_stock'] as num? ?? 0).toDouble(),
      itemType: json['item_type'] as String? ?? 'raw_material',
      costPerUnit: (json['cost_per_unit'] as num? ?? 0).toDouble(),
      currency: json['currency'] as String? ?? 'EGP',
      supplier: json['supplier'] as String?,
      category: json['category'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      expiryDate: json['expiry_date'] != null ? DateTime.tryParse(json['expiry_date'] as String) : null,
    );
  }
}
