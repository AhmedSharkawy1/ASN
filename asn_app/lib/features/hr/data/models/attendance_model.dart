class AttendanceModel {
  final String id;
  final String employeeId;
  final String? employeeName;
  final DateTime date;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final bool faceVerifiedIn;
  final bool faceVerifiedOut;
  final String status; // present | absent | late | early_leave | holiday | excused
  final double workedHours;
  final String? notes;

  const AttendanceModel({
    required this.id,
    required this.employeeId,
    this.employeeName,
    required this.date,
    this.checkIn,
    this.checkOut,
    this.faceVerifiedIn = false,
    this.faceVerifiedOut = false,
    required this.status,
    this.workedHours = 0,
    this.notes,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    final employee = json['hr_employees'];
    return AttendanceModel(
      id: json['id'] as String,
      employeeId: json['employee_id'] as String,
      employeeName: employee is Map<String, dynamic> ? employee['full_name'] as String? : null,
      date: DateTime.parse(json['date'] as String),
      checkIn: json['check_in'] != null ? DateTime.tryParse(json['check_in'] as String)?.toLocal() : null,
      checkOut: json['check_out'] != null ? DateTime.tryParse(json['check_out'] as String)?.toLocal() : null,
      faceVerifiedIn: json['face_verified_in'] as bool? ?? false,
      faceVerifiedOut: json['face_verified_out'] as bool? ?? false,
      status: json['status'] as String? ?? 'absent',
      workedHours: (json['worked_hours'] as num? ?? 0).toDouble(),
      notes: json['notes'] as String?,
    );
  }
}
