class ApiConfig {
  // ⚠️ IMPORTANTE: Cambia esta URL por la de tu servidor
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
  static const String allBookings = '/stylists/bookings/all';
  static const String approveBooking = '/stylists/bookings';
  static const String rejectBooking = '/stylists/bookings';
  static const String updateLocation = '/stylists/location';
  static const String geofenceConfig = '/stylists/geofence-config';
  static const String queuePosition = '/stylists/queue-position';
  static const String smartQueue = '/stylists/smart-queue';
}
