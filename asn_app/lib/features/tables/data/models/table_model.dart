class TableModel {
  final String id;
  final String label;
  final int capacity;
  final String status;
  final String? mergedWith;
  final String? currentOrderId;

  const TableModel({
    required this.id,
    required this.label,
    required this.capacity,
    required this.status,
    this.mergedWith,
    this.currentOrderId,
  });

  factory TableModel.fromJson(Map<String, dynamic> json) {
    return TableModel(
      id: json['id'] as String,
      label: json['label'] as String,
      capacity: (json['capacity'] as num? ?? 4).toInt(),
      status: json['status'] as String? ?? 'available',
      mergedWith: json['merged_with'] as String?,
      currentOrderId: json['current_order_id'] as String?,
    );
  }
}
