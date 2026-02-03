import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'api_config.dart';

class ApiService {
  static String? _token;

  static void setToken(String? token) {
    _token = token;
  }

  static String? getToken() {
    return _token;
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
          print('⏱️ Timeout: No se recibió respuesta del servidor');
          throw Exception('Tiempo de espera agotado. Verifica que el servidor esté corriendo en http://localhost:3005');
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
        
        // Guardar token y datos del usuario
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', _token!);
        await prefs.setString('user_id', data['user']['id'].toString());
        await prefs.setString('tenant_id', data['user']['tenant_id'].toString());
        await prefs.setString('user_email', data['user']['email']);
        await prefs.setString('user_name', '${data['user']['first_name']} ${data['user']['last_name'] ?? ''}'.trim());
        
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
      print('❌ Error de conexión: ${e.message}');
      throw Exception('Error de conexión: ${e.message}. Verifica que el servidor esté corriendo en http://localhost:3005');
    } on FormatException catch (e) {
      print('❌ Error al parsear respuesta: ${e.message}');
      throw Exception('Error al procesar la respuesta del servidor: ${e.message}');
    } catch (e) {
      if (e.toString().contains('Tiempo de espera') || 
          e.toString().contains('timeout') ||
          e.toString().contains('Credenciales inválidas')) {
        rethrow;
      }
      print('❌ Error inesperado: ${e.toString()}');
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
  static Future<List<dynamic>> getPendingBookings() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.pendingBookings}'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return List<dynamic>.from(data['bookings'] ?? []);
    } else {
      throw Exception('Error al obtener bookings: ${response.body}');
    }
  }

  // All Bookings (Todas las citas)
  static Future<List<dynamic>> getAllBookings({String? status, String? date}) async {
    final queryParams = <String, String>{};
    if (status != null) queryParams['status'] = status;
    if (date != null) queryParams['date'] = date;
    
    final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.allBookings}').replace(queryParameters: queryParams);
    
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return List<dynamic>.from(data['bookings'] ?? []);
    } else {
      throw Exception('Error al obtener todas las citas: ${response.body}');
    }
  }

  // Approve Booking
  static Future<void> approveBooking(String bookingId) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.approveBooking}/$bookingId/approve'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Error al aprobar booking: ${response.body}');
    }
  }

  // Reject Booking
  static Future<void> rejectBooking(String bookingId, {String? reason}) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.rejectBooking}/$bookingId/reject'),
      headers: _headers,
      body: jsonEncode({'reason': reason}),
    );

    if (response.statusCode != 200) {
      throw Exception('Error al rechazar booking: ${response.body}');
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
  static Future<Map<String, dynamic>> getGeofenceConfig() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.geofenceConfig}'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Error al obtener configuración: ${response.body}');
    }
  }

  // Get Queue Position (Fichero Digital)
  static Future<Map<String, dynamic>> getQueuePosition() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.queuePosition}'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Error al obtener posición en fichero: ${response.body}');
    }
  }

  // Get Smart Queue (Fichero Inteligente)
  static Future<Map<String, dynamic>> getSmartQueue() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}${ApiConfig.smartQueue}'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Error al obtener fichero inteligente: ${response.body}');
    }
  }
}
