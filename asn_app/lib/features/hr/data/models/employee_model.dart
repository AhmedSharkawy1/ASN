class EmployeeModel {
  final String id;
  final String fullName;
  final String? phone;
  final String? department;
  final String? jobTitle;
  final DateTime? hireDate;
  final double baseSalary;
  final String currency;
  final String? profilePhotoUrl;
  final bool isActive;

  const EmployeeModel({
    required this.id,
    required this.fullName,
    this.phone,
    this.department,
    this.jobTitle,
    this.hireDate,
    required this.baseSalary,
    required this.currency,
    this.profilePhotoUrl,
    this.isActive = true,
  });

  factory EmployeeModel.fromJson(Map<String, dynamic> json) {
    return EmployeeModel(
      id: json['id'] as String,
      fullName: json['full_name'] as String,
      phone: json['phone'] as String?,
      department: json['department'] as String?,
      jobTitle: json['job_title'] as String?,
      hireDate: json['hire_date'] != null ? DateTime.tryParse(json['hire_date'] as String) : null,
      baseSalary: (json['base_salary'] as num? ?? 0).toDouble(),
      currency: json['currency'] as String? ?? 'EGP',
      profilePhotoUrl: json['profile_photo_url'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
