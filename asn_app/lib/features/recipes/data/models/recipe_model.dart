class RecipeIngredient {
  final String id;
  final String inventoryItemId;
  final String? inventoryItemName;
  final double quantity;
  final String unit;

  const RecipeIngredient({
    required this.id,
    required this.inventoryItemId,
    this.inventoryItemName,
    required this.quantity,
    required this.unit,
  });

  factory RecipeIngredient.fromJson(Map<String, dynamic> json) {
    final item = json['inventory_items'];
    return RecipeIngredient(
      id: json['id'] as String,
      inventoryItemId: json['inventory_item_id'] as String,
      inventoryItemName: item is Map<String, dynamic> ? item['name'] as String? : null,
      quantity: (json['quantity'] as num? ?? 0).toDouble(),
      unit: json['unit'] as String? ?? 'kg',
    );
  }
}

class RecipeModel {
  final String id;
  final String productName;
  final String? inventoryItemId;
  final double productCost;
  final String? notes;
  final List<RecipeIngredient> ingredients;

  const RecipeModel({
    required this.id,
    required this.productName,
    this.inventoryItemId,
    required this.productCost,
    this.notes,
    this.ingredients = const [],
  });

  factory RecipeModel.fromJson(Map<String, dynamic> json) {
    return RecipeModel(
      id: json['id'] as String,
      productName: json['product_name'] as String? ?? '',
      inventoryItemId: json['inventory_item_id'] as String?,
      productCost: (json['product_cost'] as num? ?? 0).toDouble(),
      notes: json['notes'] as String?,
      ingredients: (json['recipe_ingredients'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(RecipeIngredient.fromJson)
              .toList() ??
          const [],
    );
  }
}
