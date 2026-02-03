class GeofenceConfig {
  final String tenantId;
  final String tenantName;
  final GeofenceData geofence;

  GeofenceConfig({
    required this.tenantId,
    required this.tenantName,
    required this.geofence,
  });

  factory GeofenceConfig.fromJson(Map<String, dynamic> json) {
    return GeofenceConfig(
      tenantId: json['tenant_id'] ?? '',
      tenantName: json['tenant_name'] ?? '',
      geofence: GeofenceData.fromJson(json['geofence'] ?? {}),
    );
  }
}

class GeofenceData {
  final double lat;
  final double lng;
  final int radius; // en metros
  final double radiusKm;

  GeofenceData({
    required this.lat,
    required this.lng,
    required this.radius,
    required this.radiusKm,
  });

  factory GeofenceData.fromJson(Map<String, dynamic> json) {
    return GeofenceData(
      lat: (json['center']?['lat'] ?? 0).toDouble(),
      lng: (json['center']?['lng'] ?? 0).toDouble(),
      radius: json['radius'] ?? 200,
      radiusKm: double.tryParse(json['radius_km']?.toString() ?? '0.2') ?? 0.2,
    );
  }
}

class GeofenceLog {
  final String id;
  final String eventType; // 'entry' o 'exit'
  final double? lat;
  final double? lng;
  final DateTime createdAt;

  GeofenceLog({
    required this.id,
    required this.eventType,
    this.lat,
    this.lng,
    required this.createdAt,
  });

  factory GeofenceLog.fromJson(Map<String, dynamic> json) {
    return GeofenceLog(
      id: json['id'] ?? '',
      eventType: json['event_type'] ?? '',
      lat: json['lat'] != null ? double.tryParse(json['lat'].toString()) : null,
      lng: json['lng'] != null ? double.tryParse(json['lng'].toString()) : null,
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  bool get isEntry => eventType == 'entry';
  bool get isExit => eventType == 'exit';
}
