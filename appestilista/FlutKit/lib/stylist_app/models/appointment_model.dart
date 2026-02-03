class AppointmentModel {
  final String id;
  final String serviceId;
  final String serviceName;
  final double servicePrice;
  final int durationMinutes;
  final String? clientId;
  final String? clientName;
  final String? clientPhone;
  final DateTime startTime;
  final DateTime endTime;
  final String status;
  final DateTime createdAt;

  AppointmentModel({
    required this.id,
    required this.serviceId,
    required this.serviceName,
    required this.servicePrice,
    required this.durationMinutes,
    this.clientId,
    this.clientName,
    this.clientPhone,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.createdAt,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id'] ?? '',
      serviceId: json['service_id'] ?? '',
      serviceName: json['service_name'] ?? '',
      servicePrice: (json['service_price'] ?? 0).toDouble(),
      durationMinutes: json['duration_minutes'] ?? 0,
      clientId: json['client_id'],
      clientName: json['client_name'],
      clientPhone: json['client_phone'],
      startTime: DateTime.parse(json['start_time']),
      endTime: DateTime.parse(json['end_time']),
      status: json['status'] ?? '',
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  bool get isPending => status == 'pending_approval';
  bool get isCompleted => status == 'completed' || status == 'checked_out';
}
