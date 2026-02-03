import 'dart:async';
import 'dart:math';
import 'package:geolocator/geolocator.dart';
import 'api_service.dart';
import '../models/geofence_model.dart';

class LocationService {
  static StreamSubscription<Position>? _positionStream;
  static GeofenceConfig? _geofenceConfig;
  static bool _isTracking = false;
  static bool _lastKnownInside = false;

  // Callbacks
  static Function(bool isInside)? onGeofenceStatusChanged;
  static Function(String eventType)? onGeofenceEvent;

  /// Inicializa el servicio de geolocalización
  static Future<bool> initialize() async {
    // Solicitar permisos
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('El servicio de ubicación está deshabilitado');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Permisos de ubicación denegados');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception(
          'Los permisos de ubicación están permanentemente denegados');
    }

    // Obtener configuración de geocerca
    try {
      _geofenceConfig = await ApiService.getGeofenceConfig();
    } catch (e) {
      print('Error al obtener configuración de geocerca: $e');
      // Usar valores por defecto
      _geofenceConfig = GeofenceConfig(
        tenantId: '',
        tenantName: '',
        geofence: GeofenceData(
          lat: 4.726518,
          lng: -74.034619,
          radius: 200,
          radiusKm: 0.2,
        ),
      );
    }

    return true;
  }

  /// Inicia el tracking continuo de ubicación
  static void startTracking() {
    if (_isTracking) return;

    _isTracking = true;
    const LocationSettings locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Actualizar cada 10 metros
    );

    _positionStream = Geolocator.getPositionStream(
            locationSettings: locationSettings)
        .listen((Position position) {
      _handlePositionUpdate(position);
    });
  }

  /// Detiene el tracking
  static void stopTracking() {
    _isTracking = false;
    _positionStream?.cancel();
    _positionStream = null;
  }

  /// Maneja actualizaciones de posición
  static Future<void> _handlePositionUpdate(Position position) async {
    if (_geofenceConfig == null) return;

    final geofence = _geofenceConfig!.geofence;
    final distance = _calculateDistance(
      position.latitude,
      position.longitude,
      geofence.lat,
      geofence.lng,
    );

    final isInside = distance <= geofence.radius;

    // Actualizar en el servidor
    try {
      await ApiService.updateLocation(
        lat: position.latitude,
        lng: position.longitude,
        isInsideGeofence: isInside,
      );
    } catch (e) {
      print('Error al actualizar ubicación: $e');
    }

    // Detectar cambio de estado
    if (_lastKnownInside != isInside) {
      _lastKnownInside = isInside;
      final eventType = isInside ? 'entry' : 'exit';

      // Notificar callbacks
      onGeofenceStatusChanged?.call(isInside);
      onGeofenceEvent?.call(eventType);

      print('📍 Evento de geocerca: $eventType');
    }
  }

  /// Calcula la distancia entre dos puntos (Haversine)
  static double _calculateDistance(
      double lat1, double lng1, double lat2, double lng2) {
    const double earthRadius = 6371000; // metros

    double dLat = _toRadians(lat2 - lat1);
    double dLng = _toRadians(lng2 - lng1);

    double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRadians(lat1)) *
            cos(_toRadians(lat2)) *
            sin(dLng / 2) *
            sin(dLng / 2);

    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadius * c;
  }

  static double _toRadians(double degrees) {
    return degrees * (pi / 180);
  }

  /// Obtiene la ubicación actual
  static Future<Position> getCurrentLocation() async {
    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  /// Verifica si está dentro de la geocerca
  static bool isInsideGeofence(double lat, double lng) {
    if (_geofenceConfig == null) return false;

    final geofence = _geofenceConfig!.geofence;
    final distance = _calculateDistance(lat, lng, geofence.lat, geofence.lng);
    return distance <= geofence.radius;
  }

  /// Obtiene la configuración de geocerca
  static GeofenceConfig? getGeofenceConfig() => _geofenceConfig;
}
