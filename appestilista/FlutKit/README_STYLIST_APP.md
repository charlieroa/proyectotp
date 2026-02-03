# App Estilista - Guía de Inicio

## ✅ Estado del Proyecto

La app Flutter para estilistas está **COMPLETA** con las siguientes funcionalidades:

- ✅ Login con autenticación (role_id = 3)
- ✅ Dashboard con estadísticas
- ✅ Bookings pendientes (aceptar/rechazar)
- ✅ Servicios atendidos (historial)
- ✅ Ventas de productos
- ✅ Geolocalización con tracking de geocerca
- ✅ Historial de entrada/salida

## 📁 Estructura de Archivos

```
lib/stylist_app/
├── config/
│   └── api_config.dart          # Configuración de API
├── models/
│   ├── user_model.dart          # Modelo de usuario
│   ├── appointment_model.dart   # Modelo de citas
│   └── geofence_model.dart     # Modelo de geocerca
├── services/
│   ├── api_service.dart         # Servicio de API
│   └── location_service.dart   # Servicio de geolocalización
├── screens/
│   ├── login_screen.dart        # Pantalla de login
│   ├── dashboard_screen.dart   # Dashboard principal
│   ├── bookings_screen.dart    # Bookings pendientes
│   ├── services_screen.dart    # Servicios atendidos
│   ├── products_screen.dart    # Ventas de productos
│   └── geolocation_screen.dart  # Geolocalización
└── main_stylist.dart           # Punto de entrada de la app
```

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd appestilista/FlutKit
flutter pub get
```

### 2. Configurar API

Edita `lib/stylist_app/config/api_config.dart` y cambia la URL:

```dart
static const String baseUrl = 'http://TU_IP:3005/api';
// O para producción:
// static const String baseUrl = 'https://tu-dominio.com/api';
```

### 3. Configurar Google Maps (para geolocalización)

#### Android

1. Obtén una API key de Google Maps: https://console.cloud.google.com/
2. Edita `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
    <meta-data
        android:name="com.google.android.geo.API_KEY"
        android:value="TU_API_KEY_AQUI"/>
</application>
```

#### iOS

1. Edita `ios/Runner/AppDelegate.swift`:

```swift
import GoogleMaps

GMSServices.provideAPIKey("TU_API_KEY_AQUI")
```

### 4. Permisos de ubicación

#### Android

En `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

#### iOS

En `ios/Runner/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación para rastrear tu asistencia</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Necesitamos tu ubicación para rastrear tu asistencia</string>
```

## 🏃 Ejecutar la App

### Opción 1: Usar main_stylist.dart (App Estilista)

```bash
flutter run -t lib/stylist_app/main_stylist.dart
```

### Opción 2: Cambiar main.dart

Reemplaza el contenido de `lib/main.dart` con:

```dart
export 'stylist_app/main_stylist.dart';
```

Luego ejecuta:

```bash
flutter run
```

## 📱 Funcionalidades

### 1. Login
- Autenticación con email/password
- Valida que el usuario sea estilista (role_id = 3)
- Guarda token JWT en SharedPreferences

### 2. Dashboard
- Muestra estadísticas del día y mes
- Accesos rápidos a todas las secciones
- Indicador de estado de geocerca

### 3. Bookings Pendientes
- Lista todas las citas pendientes de aprobación
- Botones para aprobar o rechazar
- Opción de agregar razón al rechazar

### 4. Servicios Atendidos
- Historial completo de servicios completados
- Muestra cliente, fecha, precio
- Filtros por fecha (próximamente)

### 5. Ventas de Productos
- Lista de productos vendidos
- Muestra comisiones ganadas
- Filtros por fecha (próximamente)

### 6. Geolocalización
- Mapa con ubicación actual
- Círculo de geocerca visible
- Tracking automático en background
- Historial de entrada/salida
- Indicador visual de estado

## 🔧 Configuración del Backend

Asegúrate de que el backend tenga:

1. ✅ Tabla `geofence_logs` creada (ejecutar `back/migrations/create_geofence_logs.sql`)
2. ✅ Endpoints funcionando (ver `back/src/controllers/stylistAppController.js`)
3. ✅ CORS configurado para permitir requests desde la app

## 🐛 Troubleshooting

### Error: "Este usuario no es un estilista"
- Verifica que el usuario tenga `role_id = 3` en la base de datos

### Error de permisos de ubicación
- Verifica que los permisos estén configurados en AndroidManifest.xml / Info.plist
- En Android 6+, los permisos se solicitan en tiempo de ejecución

### Error: "El servicio de ubicación está deshabilitado"
- Activa la ubicación en la configuración del dispositivo

### El mapa no se muestra
- Verifica que la API key de Google Maps esté configurada correctamente
- Revisa los logs de consola para errores específicos

### No se registran eventos de geocerca
- Verifica que la tabla `geofence_logs` exista en la BD
- Revisa los logs del backend para errores

## 📝 Próximas Mejoras

- [ ] Agregar pantalla de préstamos
- [ ] Agregar filtros de fecha en servicios y ventas
- [ ] Notificaciones push para nuevos bookings
- [ ] Modo offline básico
- [ ] Sincronización automática de datos
- [ ] Configuración de geocerca desde la app (solo admin)

## 📞 Soporte

Para problemas o preguntas, revisa:
- `PLAN_IMPLEMENTACION.md` - Documentación completa
- Logs del backend: `pm2 logs newtpiaback`
- Logs de Flutter: `flutter run -v`
