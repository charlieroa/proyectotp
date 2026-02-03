import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/user_model.dart';
import '../models/appointment_model.dart';
import '../models/geofence_model.dart';

class ApiService {
  static String? _token;

  static void setToken(String? token) {
    _token = token;
  }

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  // Login
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final url = '${ApiConfig.baseUrl}${ApiConfig.login}';
      print('🔐 Intentando login en: $url');
      print('📧 Email: $email');
      
      final response = await http.post(
        Uri.parse(url),
        headers: _headers,
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('Tiempo de espera agotado. Verifica que el servidor esté corriendo.');
        },
      );

      print('📥 Status Code: ${response.statusCode}');
      print('📥 Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Verificar que la respuesta tenga la estructura esperada
        if (data['token'] == null) {
          throw Exception('El servidor no devolvió un token. Respuesta: ${response.body}');
        }
        
        if (data['user'] == null) {
          throw Exception('El servidor no devolvió información del usuario. Respuesta: ${response.body}');
        }
        
        // Verificar que sea estilista (role_id = 3)
        final roleId = data['user']?['role_id'];
        if (roleId != 3) {
          throw Exception('Este usuario no es un estilista (role_id: $roleId). Solo los estilistas pueden usar esta app.');
        }
        
        _token = data['token'];
        return data;
      } else {
        // Intentar parsear el error del servidor
        try {
          final errorData = jsonDecode(response.body);
          final errorMessage = errorData['error'] ?? response.body;
          throw Exception('Error en login: $errorMessage');
        } catch (e) {
          throw Exception('Error en login (${response.statusCode}): ${response.body}');
        }
      }
    } on http.ClientException catch (e) {
      throw Exception('Error de conexión: ${e.message}. Verifica que el servidor esté corriendo y la URL sea correcta.');
    } on FormatException catch (e) {
      throw Exception('Error al procesar la respuesta del servidor: ${e.message}');
    } catch (e) {
      if (e.toString().contains('Tiempo de espera') || e.toString().contains('timeout')) {
        rethrow;
      }
      throw Exception('Error inesperado: ${e.toString()}');
    }
  }

  // Dashboard Stats
  static Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.dashboardStats}'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Error al obtener estadísticas: ${response.body}');
    }
  }

  // Pending Bookings
  static Future<List<AppointmentModel>> getPendingBookings() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.pendingBookings}'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> bookings = data['bookings'] ?? [];
      return bookings.map((json) => AppointmentModel.fromJson(json)).toList();
    } else {
      throw Exception('Error al obtener bookings: ${response.body}');
    }
  }

  // Approve Booking
  static Future<void> approveBooking(String bookingId) async {
    final response = await http.post(
      Uri.parse(
          '${ApiConfig.baseUrl}${ApiConfig.approveBooking}/$bookingId/approve'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Error al aprobar booking: ${response.body}');
    }
  }

  // Reject Booking
  static Future<void> rejectBooking(String bookingId, {String? reason}) async {
    final response = await http.post(
      Uri.parse(
          '${ApiConfig.baseUrl}${ApiConfig.approveBooking}/$bookingId/reject'),
      headers: _headers,
      body: jsonEncode({'reason': reason}),
    );

    if (response.statusCode != 200) {
      throw Exception('Error al rechazar booking: ${response.body}');
    }
  }

  // Services Attended
  static Future<List<AppointmentModel>> getServicesAttended({
    String? startDate,
    String? endDate,
    int limit = 50,
    int offset = 0,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.servicesAttended}')
        .replace(queryParameters: {
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
      'limit': limit.toString(),
      'offset': offset.toString(),
    });

    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> services = data['services'] ?? [];
      return services.map((json) => AppointmentModel.fromJson(json)).toList();
    } else {
      throw Exception('Error al obtener servicios: ${response.body}');
    }
  }

  // Product Sales
  static Future<List<Map<String, dynamic>>> getProductSales({
    String? startDate,
    String? endDate,
    int limit = 50,
    int offset = 0,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.productSales}')
        .replace(queryParameters: {
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
      'limit': limit.toString(),
      'offset': offset.toString(),
    });

    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return List<Map<String, dynamic>>.from(data['sales'] ?? []);
    } else {
      throw Exception('Error al obtener ventas: ${response.body}');
    }
  }

  // Update Location
  static Future<void> updateLocation({
    required double lat,
    required double lng,
    required bool isInsideGeofence,
  }) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.updateLocation}'),
      headers: _headers,
      body: jsonEncode({
        'lat': lat,
        'lng': lng,
        'is_inside_geofence': isInsideGeofence,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Error al actualizar ubicación: ${response.body}');
    }
  }

  // Get Geofence Config
  static Future<GeofenceConfig> getGeofenceConfig() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.geofenceConfig}'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return GeofenceConfig.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Error al obtener configuración: ${response.body}');
    }
  }

  // Get Geofence Logs
  static Future<List<GeofenceLog>> getGeofenceLogs({
    String? startDate,
    String? endDate,
    int limit = 50,
    int offset = 0,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.geofenceLogs}')
        .replace(queryParameters: {
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
      'limit': limit.toString(),
      'offset': offset.toString(),
    });

    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> logs = data['logs'] ?? [];
      return logs.map((json) => GeofenceLog.fromJson(json)).toList();
    } else {
      throw Exception('Error al obtener logs: ${response.body}');
    }
  }
}
