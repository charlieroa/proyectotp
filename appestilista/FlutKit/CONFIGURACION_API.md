# 📍 Configuración de la URL de la API

## Ubicación del archivo

El archivo de configuración está en:
```
appestilista/FlutKit/lib/stylist_app/config/api_config.dart
```

## Cómo configurar

### 1. Abre el archivo `api_config.dart`

### 2. Cambia la línea `baseUrl` según tu caso:

#### Para Android Emulator (desarrollo local):
```dart
static const String baseUrl = 'http://10.0.2.2:3005/api';
```
> `10.0.2.2` es la IP especial que el emulador Android usa para acceder a `localhost` de tu PC

#### Para iOS Simulator (desarrollo local):
```dart
static const String baseUrl = 'http://localhost:3005/api';
```

#### Para dispositivo físico (mismo WiFi):
```dart
static const String baseUrl = 'http://192.168.1.XXX:3005/api';
```
> Reemplaza `XXX` con la IP de tu servidor. Ejemplo: `192.168.1.100`

**Para encontrar la IP de tu servidor:**
- Windows: Abre CMD y ejecuta `ipconfig`, busca "IPv4"
- Linux/Mac: Ejecuta `ifconfig` o `ip addr`

#### Para producción (servidor remoto):
```dart
static const String baseUrl = 'https://api.tupelukeria.com/api';
```
> Usa tu dominio real con HTTPS

## Ejemplo completo

```dart
class ApiConfig {
  // Cambia esta línea según tu caso:
  static const String baseUrl = 'http://10.0.2.2:3005/api'; // Android Emulator
  
  // Endpoints (no cambiar)
  static const String login = '/auth/login';
  // ... resto de endpoints
}
```

## Verificar que funciona

1. Asegúrate de que tu servidor backend esté corriendo en el puerto 3005
2. Verifica que el servidor acepte conexiones desde la app (CORS configurado)
3. Ejecuta la app y prueba el login

## Troubleshooting

### Error: "Connection refused" o "Failed host lookup"
- Verifica que la IP/URL sea correcta
- Verifica que el servidor esté corriendo
- Si usas dispositivo físico, asegúrate de estar en la misma red WiFi

### Error: "CORS policy"
- El backend debe tener CORS configurado para aceptar requests desde la app móvil
- Verifica `back/src/index.js` que tenga CORS habilitado

### Android Emulator no conecta
- Usa `10.0.2.2` en lugar de `localhost`
- Verifica que el servidor esté corriendo en tu PC

### iOS Simulator no conecta
- Usa `localhost` o `127.0.0.1`
- Verifica que el servidor esté corriendo
