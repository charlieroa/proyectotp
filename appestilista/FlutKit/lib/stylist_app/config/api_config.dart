class ApiConfig {
  // ⚠️ IMPORTANTE: Cambia esta URL por la de tu servidor
  // 
  // Para desarrollo local (emulador Android):
  //   - Android Emulator: usa 'http://10.0.2.2:3005/api'
  //   - iOS Simulator: usa 'http://localhost:3005/api'
  //
  // Para dispositivo físico o producción:
  //   - Usa la IP de tu servidor: 'http://192.168.1.XXX:3005/api'
  //   - O tu dominio: 'https://tu-dominio.com/api'
  //
  // Ejemplo con IP local: 'http://192.168.1.100:3005/api'
  // Ejemplo con dominio: 'https://api.tupelukeria.com/api'
  
  // ⚠️ CAMBIA ESTA URL SEGÚN TU CASO:
  
  // Para desarrollo local (Chrome/Web):
  static const String baseUrl = 'http://localhost:3005/api';
  
  // Para Android Emulator:
  // static const String baseUrl = 'http://10.0.2.2:3005/api';
  
  // Para iOS Simulator:
  // static const String baseUrl = 'http://localhost:3005/api';
  
  // Para dispositivo físico (mismo WiFi):
  // static const String baseUrl = 'http://192.168.1.XXX:3005/api';
  
  // Para producción:
  // static const String baseUrl = 'https://api.tupelukeria.com/api';
  
  // Endpoints
  static const String login = '/auth/login';
  static const String dashboardStats = '/stylists/stats';
  static const String pendingBookings = '/stylists/bookings/pending';
  static const String approveBooking = '/stylists/bookings';
  static const String servicesAttended = '/stylists/services/attended';
  static const String productSales = '/stylists/products/sales';
  static const String loans = '/staff-loans/stylist';
  static const String purchases = '/staff-purchases/stylist';
  static const String updateLocation = '/stylists/location';
  static const String geofenceConfig = '/stylists/geofence-config';
  static const String geofenceLogs = '/stylists/geofence-logs';
}
