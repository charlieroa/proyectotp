# Análisis del Proyecto TPIA

Este documento contiene un análisis técnico completo de la estructura y tecnologías utilizadas en el proyecto.

## Visión General
El proyecto es una aplicación web full-stack diseñada para la gestión de salones de belleza o negocios similares. Utiliza una arquitectura cliente-servidor separada.

- **Backend**: Node.js con Express y PostgreSQL.
- **Frontend**: React con TypeScript y Redux.

## Estructura del Directorio Raíz
- **`back/`**: Código fuente del servidor (API).
- **`front/`**: Código fuente del cliente (Interfaz de usuario).
- **`FlutKit_v17.1/`**: Posible referencia a recursos móviles o un kit de UI externo.

---

## 1. Análisis del Backend (`/back`)

### Tecnologías Clave
- **Runtime**: Node.js (v16-v20 recomendado).
- **Framework**: Express.js.
- **Base de Datos**: PostgreSQL (driver `pg`), configuración en `src/config/db.js`.
- **Autenticación**: JWT (`jsonwebtoken`) y `bcryptjs` para hashing de contraseñas.
- **Tiempo Real**: Socket.io para comunicación bidireccional.
- **Manejo de Imágenes**: `multer` y `jimp`.
- **Fechas**: `date-fns`.

### Arquitectura (MVC)
El backend sigue una estructura MVC (Modelo-Vista-Controlador) tradicional:
- **`src/controllers/`**: Lógica de negocio (e.g., `appointmentController`, `authController`).
- **`src/routes/`**: Definición de endpoints de la API.
- **`src/middleware/`**: Interceptores para autenticación y validación.
- **`src/config/`**: Configuración de base de datos.
- **`src/services/`**: Lógica de negocio reutilizable.

### Módulos Principales (Rutas)
Detectamos los siguientes dominios funcionales:
- **Gestión de Citas**: `appointmentRoutes`, `stylistRoutes`, `serviceRoutes`.
- **Usuarios y Seguridad**: `authRoutes`, `userRoutes`, `tenantRoutes` (Soporte multi-tenant).
- **Inventario y Productos**: `productRoutes`, `categoryRoutes`, `productCategoryRoutes`.
- **Finanzas y RRHH**: `cashRoutes`, `paymentRoutes`, `payrollRoutes`, `staffLoanRoutes`.
- **Integraciones**: `whatsappRoutes`, `aiChatRoutes` (Chatbot/IA).

---

## 2. Análisis del Frontend (`/front`)

### Tecnologías Clave
- **Framework**: React 18.3.1.
- **Lenguaje**: TypeScript.
- **Estado Global**: Redux Toolkit (slices en `src/slices/`).
- **Estilos**: Bootstrap 5, SASS/SCSS.
- **Enrutamiento**: React Router DOM v6.
- **UI Components**:
    - `FullCalendar` para gestión de agendas.
    - `ApexCharts`, `Chart.js`, `ECharts` para reportes y dashboard.
    - `React Table` y `GridJS` para tablas de datos.
    - `Formik` + `Yup` para formularios y validación.
- **Mapas**: Google Maps API.

### Estructura
- **`src/pages/`**: Vistas principales de la aplicación.
- **`src/Components/`**: Componentes reutilizables de UI.
- **`src/Layouts/`**: Estructuras de página (Header, Sidebar, Footer).
- **`src/slices/`**: Lógica de estado Redux (e.g., autenticación, carrito, calendario).
- **`src/services/`**: Llamadas a la API backend.

---

## 3. Observaciones y Recomendaciones

### Puntos Fuertes
1. **Separación de Responsabilidades**: Clara distinción entre Frontend y Backend.
2. **Tipado Estático en Front**: El uso de TypeScript en el frontend mejora la mantenibilidad y reduce errores.
3. **Funcionalidad Completa**: Cubre aspectos operativos (citas), financieros (nómina) y administrativos (inventario).
4. **Moderno**: Usa versiones recientes de React y Hooks.

### Áreas de Atención
1. **ORM vs Query Directa**: El backend usa `pg` directamente. Asegúrate de manejar bien la sanitización de SQL si no estás usando un Query Builder o ORM para prevenir inyecciones SQL.
2. **Validación de Tipos en Back**: El backend es JavaScript puro. Considerar migrar a TypeScript o usar JSDoc agresivamente para mantener consistencia con el frontend.
3. **Escalabilidad del Chat**: La integración con WhatsApp y AI Chat sugiere un flujo asíncrono. Monitorear el rendimiento de Socket.io si el volumen de mensajes crece.
