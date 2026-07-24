class CustomerModel {
  final String id;
  final String name;
  final String? phone;
  final String? address;
  final String? notes;
  final DateTime? createdAt;

  const CustomerModel({
    required this.id,
    required this.name,
    this.phone,
    this.address,
    this.notes,
    this.createdAt,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String?,
      address: json['address'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'] as String) : null,
    );
  }
}
