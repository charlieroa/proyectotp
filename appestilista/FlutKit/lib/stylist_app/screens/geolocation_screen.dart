import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../../helpers/theme/app_theme.dart';
import '../services/location_service.dart';
import '../services/api_service.dart';
import '../models/geofence_model.dart';

class GeolocationScreen extends StatefulWidget {
  const GeolocationScreen({super.key});

  @override
  State<GeolocationScreen> createState() => _GeolocationScreenState();
}

class _GeolocationScreenState extends State<GeolocationScreen> {
  GoogleMapController? _mapController;
  Position? _currentPosition;
  GeofenceConfig? _geofenceConfig;
  List<GeofenceLog> _logs = [];
  bool _isLoading = true;
  bool _isInsideGeofence = false;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      // Obtener ubicación actual
      _currentPosition = await LocationService.getCurrentLocation();

      // Obtener configuración de geocerca
      _geofenceConfig = await ApiService.getGeofenceConfig();
      if (_geofenceConfig != null) {
        _isInsideGeofence = LocationService.isInsideGeofence(
          _currentPosition!.latitude,
          _currentPosition!.longitude,
        );
      }

      // Obtener logs
      final logs = await ApiService.getGeofenceLogs(limit: 20);
      setState(() {
        _logs = logs;
        _isLoading = false;
      });

      // Configurar callback
      LocationService.onGeofenceStatusChanged = (isInside) {
        setState(() => _isInsideGeofence = isInside);
      };
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
    if (_currentPosition != null && _geofenceConfig != null) {
      _mapController!.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          16,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Geolocalización'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Estado de geocerca
                Container(
                  padding: const EdgeInsets.all(16),
                  color: _isInsideGeofence ? Colors.green.shade50 : Colors.red.shade50,
                  child: Row(
                    children: [
                      Icon(
                        _isInsideGeofence ? Icons.check_circle : Icons.cancel,
                        color: _isInsideGeofence ? Colors.green : Colors.red,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _isInsideGeofence
                              ? 'Dentro de la geocerca'
                              : 'Fuera de la geocerca',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _isInsideGeofence ? Colors.green : Colors.red,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Mapa
                Expanded(
                  child: _currentPosition == null || _geofenceConfig == null
                      ? const Center(child: Text('Cargando mapa...'))
                      : GoogleMap(
                          onMapCreated: _onMapCreated,
                          initialCameraPosition: CameraPosition(
                            target: LatLng(
                              _currentPosition!.latitude,
                              _currentPosition!.longitude,
                            ),
                            zoom: 16,
                          ),
                          myLocationEnabled: true,
                          myLocationButtonEnabled: true,
                          circles: {
                            Circle(
                              circleId: const CircleId('geofence'),
                              center: LatLng(
                                _geofenceConfig!.geofence.lat,
                                _geofenceConfig!.geofence.lng,
                              ),
                              radius: _geofenceConfig!.geofence.radius.toDouble(),
                              strokeColor: Colors.blue,
                              strokeWidth: 2,
                              fillColor: Colors.blue.withOpacity(0.1),
                            ),
                          },
                          markers: {
                            Marker(
                              markerId: const MarkerId('current'),
                              position: LatLng(
                                _currentPosition!.latitude,
                                _currentPosition!.longitude,
                              ),
                              infoWindow: const InfoWindow(
                                title: 'Tu ubicación',
                              ),
                            ),
                            Marker(
                              markerId: const MarkerId('geofence_center'),
                              position: LatLng(
                                _geofenceConfig!.geofence.lat,
                                _geofenceConfig!.geofence.lng,
                              ),
                              icon: BitmapDescriptor.defaultMarkerWithHue(
                                BitmapDescriptor.hueBlue,
                              ),
                              infoWindow: InfoWindow(
                                title: 'Centro de geocerca',
                                snippet:
                                    'Radio: ${_geofenceConfig!.geofence.radiusKm} km',
                              ),
                            ),
                          },
                        ),
                ),
                // Logs
                Container(
                  height: 200,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Historial de Entrada/Salida',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Expanded(
                        child: _logs.isEmpty
                            ? const Center(
                                child: Text('No hay registros aún'),
                              )
                            : ListView.builder(
                                itemCount: _logs.length,
                                itemBuilder: (context, index) {
                                  final log = _logs[index];
                                  return ListTile(
                                    dense: true,
                                    leading: Icon(
                                      log.isEntry
                                          ? Icons.login
                                          : Icons.logout,
                                      color: log.isEntry
                                          ? Colors.green
                                          : Colors.red,
                                    ),
                                    title: Text(
                                      log.isEntry ? 'Entrada' : 'Salida',
                                      style: const TextStyle(fontSize: 14),
                                    ),
                                    trailing: Text(
                                      DateFormat('HH:mm').format(log.createdAt),
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
