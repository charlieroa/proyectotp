import 'dart:async';
import 'dart:math';
import 'package:geolocator/geolocator.dart';
import 'api_service.dart';

class LocationService {
  static StreamSubscription<Position>? _positionStream;
  static Map<String, dynamic>? _geofenceConfig;
  static bool _isTracking = false;
  static bool _lastKnownInside = false;
  static Timer? _updateTimer;

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
      _geofenceConfig = {
        'geofence': {
          'center': {'lat': 4.726518, 'lng': -74.034619},
          'radius': 200
        }
      };
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

    // También actualizar cada 30 segundos como respaldo
    _updateTimer = Timer.periodic(const Duration(seconds: 30), (timer) async {
      try {
        Position position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high);
        _handlePositionUpdate(position);
      } catch (e) {
        print('Error obteniendo ubicación: $e');
      }
    });
  }

  /// Detiene el tracking
  static void stopTracking() {
    _isTracking = false;
    _positionStream?.cancel();
    _updateTimer?.cancel();
    _positionStream = null;
    _updateTimer = null;
  }

  /// Maneja actualizaciones de posición
  static void _handlePositionUpdate(Position position) {
    if (_geofenceConfig == null) return;

    final geofence = _geofenceConfig!['geofence'];
    final center = geofence['center'];
    final radius = geofence['radius'] ?? 200;

    bool isInside = isInsideGeofence(
      position.latitude,
      position.longitude,
    );

    // Detectar cambio de estado
    if (_lastKnownInside != isInside) {
      _lastKnownInside = isInside;
      if (onGeofenceStatusChanged != null) {
        onGeofenceStatusChanged!(isInside);
      }
      if (onGeofenceEvent != null) {
        onGeofenceEvent!(isInside ? 'entry' : 'exit');
      }
    }

    // Enviar ubicación al servidor
    _updateLocationOnServer(position.latitude, position.longitude, isInside);
  }

  /// Calcula si una posición está dentro de la geocerca
  static bool isInsideGeofence(double lat, double lng) {
    if (_geofenceConfig == null) return false;

    final geofence = _geofenceConfig!['geofence'];
    final center = geofence['center'];
    final radius = geofence['radius'] ?? 200;

    double distance = _calculateDistance(
      lat,
      lng,
      center['lat'].toDouble(),
      center['lng'].toDouble(),
    );

    return distance <= radius;
  }

  /// Calcula la distancia entre dos puntos en metros
  static double _calculateDistance(
      double lat1, double lng1, double lat2, double lng2) {
    return Geolocator.distanceBetween(lat1, lng1, lat2, lng2);
  }

  /// Actualiza la ubicación en el servidor
  static Future<void> _updateLocationOnServer(
      double lat, double lng, bool isInside) async {
    try {
      await ApiService.updateLocation(
        lat: lat,
        lng: lng,
        isInsideGeofence: isInside,
      );
    } catch (e) {
      print('Error actualizando ubicación en servidor: $e');
    }
  }

  /// Obtiene la ubicación actual
  static Future<Position> getCurrentLocation() async {
    return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high);
  }
}
