# Plan de Implementación - App Estilista

## 📋 Resumen del Proyecto

Esta app Flutter está diseñada para estilistas (role_id = 3) y permite:
- Ver servicios atendidos
- Aceptar/rechazar bookings
- Ver ventas de productos
- Ver préstamos (si está habilitado)
- Tracking de geolocalización con entrada/salida de geocerca

## 🗄️ Base de Datos

### Rol Estilista
- **role_id**: `3`
- Verificado en: `back/src/controllers/stylistController.js`

### Tabla de Geocerca
Ejecutar el script SQL: `back/migrations/create_geofence_logs.sql`

## 🔌 Endpoints API Disponibles

### Autenticación
- **POST** `/api/auth/login` - Login (retorna token JWT)
- El token debe incluir `role_id = 3` para estilistas

### Dashboard
- **GET** `/api/stylists/stats`
  - Retorna: `services_today`, `earnings_today`, `pending_approval`, `total_services_month`

### Bookings (Citas)
- **GET** `/api/stylists/bookings/pending` - Lista citas pendientes de aprobación
- **POST** `/api/stylists/bookings/:bookingId/approve` - Aprobar cita
- **POST** `/api/stylists/bookings/:bookingId/reject` - Rechazar cita
  - Body (reject): `{ "reason": "Razón opcional" }`

### Servicios Atendidos
- **GET** `/api/stylists/services/attended`
  - Query params: `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&limit=50&offset=0`

### Ventas de Productos
- **GET** `/api/stylists/products/sales`
  - Query params: `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&limit=50&offset=0`
  - Retorna: productos vendidos con comisiones

### Préstamos
- **GET** `/api/staff-loans/stylist/:stylistId` - Lista préstamos del estilista
- **GET** `/api/staff-loans/:loanId` - Detalle de préstamo

### Compras de Personal
- **GET** `/api/staff-purchases/stylist/:stylistId` - Lista compras del estilista

### Geolocalización
- **POST** `/api/stylists/location`
  - Body: `{ "lat": 4.726518, "lng": -74.034619, "is_inside_geofence": true }`
  - Automáticamente registra entrada/salida en `geofence_logs`
- **GET** `/api/stylists/geofence-logs`
  - Query params: `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&limit=50&offset=0`
  - Retorna historial de entrada/salida

## 📱 Estructura de la App Flutter

### Pantallas Principales

1. **Login Screen**
   - Autenticación con email/password
   - Validar que `role_id = 3`
   - Guardar token JWT en `shared_preferences`

2. **Dashboard Screen**
   - Cards con estadísticas:
     - Servicios hoy
     - Ganancias hoy
     - Pendientes de aprobación
     - Total del mes
   - Accesos rápidos a:
     - Bookings pendientes
     - Servicios atendidos
     - Ventas
     - Préstamos

3. **Bookings Screen**
   - Lista de citas con `status = 'pending_approval'`
   - Botones: Aprobar / Rechazar
   - Mostrar: Cliente, Servicio, Fecha/Hora

4. **Services Attended Screen**
   - Historial de servicios completados
   - Filtros por fecha
   - Detalles: Cliente, Servicio, Precio, Comisión

5. **Product Sales Screen**
   - Lista de productos vendidos
   - Mostrar: Producto, Cantidad, Precio, Comisión
   - Filtros por fecha

6. **Loans Screen** (si está habilitado)
   - Lista de préstamos
   - Mostrar: Monto, Cuotas, Estado
   - Detalle de cuotas pendientes

7. **Geolocation Screen**
   - Mapa con ubicación actual
   - Indicador de estar dentro/fuera de geocerca
   - Historial de entrada/salida
   - Tracking automático en background

## 🔧 Configuración Técnica

### Dependencias Flutter Necesarias

```yaml
dependencies:
  # HTTP Client
  http: ^1.1.0
  dio: ^5.4.0  # Alternativa más robusta
  
  # Estado
  provider: ^6.1.5+1  # Ya incluido en pubspec.yaml
  
  # Local Storage
  shared_preferences: ^2.5.3  # Ya incluido
  
  # Geolocalización
  geolocator: ^10.1.0
  geocoding: ^2.1.1
  
  # Mapas
  google_maps_flutter: ^2.13.1  # Ya incluido
  
  # JWT
  jwt_decoder: ^2.0.1
  
  # UI
  flutter_lucide: ^1.7.0  # Ya incluido
  intl: ^0.20.2  # Ya incluido
```

### Variables de Entorno

Crear archivo `.env` o configurar en código:
```dart
class ApiConfig {
  static const String baseUrl = 'https://tu-api.com/api';
  static const String googleMapsApiKey = 'TU_API_KEY';
}
```

### Modelos de Datos

Crear modelos Dart para:
- `User` (estilista)
- `Appointment` (cita)
- `Service` (servicio)
- `ProductSale` (venta de producto)
- `Loan` (préstamo)
- `GeofenceLog` (log de geocerca)

### Servicios API

Crear servicios para:
- `AuthService` - Login/logout
- `DashboardService` - Estadísticas
- `BookingService` - Aprobar/rechazar citas
- `ServiceService` - Historial de servicios
- `ProductService` - Ventas de productos
- `LoanService` - Préstamos
- `LocationService` - Geolocalización y tracking

## 📍 Geolocalización - Implementación Detallada

### Flujo de Tracking

1. **Inicialización**
   - Solicitar permisos de ubicación
   - Obtener coordenadas de la geocerca del tenant (desde API o configuración)
   - Configurar listener de ubicación

2. **Tracking Continuo**
   - Actualizar ubicación cada 30-60 segundos
   - Calcular distancia al centro de geocerca
   - Determinar si está dentro del radio
   - Enviar a `/api/stylists/location` con `is_inside_geofence`

3. **Detección de Entrada/Salida**
   - El backend detecta cambios de estado
   - Registra automáticamente en `geofence_logs`
   - La app puede consultar historial con `/api/stylists/geofence-logs`

### Cálculo de Distancia

```dart
double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
  // Fórmula de Haversine
  const double earthRadius = 6371000; // metros
  double dLat = _toRadians(lat2 - lat1);
  double dLng = _toRadians(lng2 - lng1);
  
  double a = sin(dLat / 2) * sin(dLat / 2) +
      cos(_toRadians(lat1)) * cos(_toRadians(lat2)) *
      sin(dLng / 2) * sin(dLng / 2);
  
  double c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return earthRadius * c;
}
```

## 🎨 UI/UX Recomendaciones

- Usar Material Design 3 (ya incluido en la plantilla)
- Colores:
  - Verde: Dentro de geocerca
  - Rojo: Fuera de geocerca
  - Azul: Pendiente
- Iconos: Usar `flutter_lucide` (ya incluido)
- Navegación: Bottom Navigation Bar o Drawer

## ✅ Checklist de Implementación

- [ ] Configurar autenticación (JWT, role_id=3)
- [ ] Crear modelos de datos
- [ ] Implementar servicios API
- [ ] Pantalla Login
- [ ] Pantalla Dashboard
- [ ] Pantalla Bookings (aceptar/rechazar)
- [ ] Pantalla Servicios Atendidos
- [ ] Pantalla Ventas de Productos
- [ ] Pantalla Préstamos (si aplica)
- [ ] Implementar geolocalización
- [ ] Tracking de geocerca en background
- [ ] Pantalla de Historial de Geocerca
- [ ] Testing básico
- [ ] Configurar permisos Android/iOS

## 📝 Notas Importantes

1. **Autenticación**: El token JWT debe incluir `role_id = 3` y `tenant_id`
2. **Geocerca**: El radio y centro deben obtenerse del tenant (puede requerir endpoint adicional)
3. **Préstamos**: Solo mostrar si el módulo está habilitado en el tenant
4. **Background Tracking**: Considerar usar `workmanager` para tracking en background
5. **Permisos**: Solicitar permisos de ubicación en tiempo de ejecución

## 🔗 Referencias

- Backend API: `back/src/controllers/stylistAppController.js`
- Rutas: `back/src/routes/stylistRoutes.js`
- Módulo de geolocalización web: `front/src/pages/Geolocalizacion/index.tsx`
