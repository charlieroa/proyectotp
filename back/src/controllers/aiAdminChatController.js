// src/controllers/aiAdminChatController.js
'use strict';

const prisma = require('../config/prisma');
const db = require('../config/db');
const { formatInTimeZone, zonedTimeToUtc } = require('date-fns-tz');
const { getGlobalOpenAIKey } = require('../services/openaiKeyService');
const { trackUsage } = require('../services/tokenTracker');
const { getTenantPlan, isPlanAtLeast } = require('../middleware/planMiddleware');
const { calculateStylistPayrollBreakdown } = require('./payrollController');

const TIME_ZONE = 'America/Bogota';

// ==================== HELPERS ====================

function normalizeDateKeyword(dateStr) {
    if (!dateStr) return formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    const s = String(dateStr).toLowerCase();
    const now = new Date();
    const today = formatInTimeZone(now, TIME_ZONE, 'yyyy-MM-dd');
    const tomorrow = formatInTimeZone(new Date(now.getTime() + 24 * 60 * 60 * 1000), TIME_ZONE, 'yyyy-MM-dd');
    if (s.includes('mañana')) return tomorrow;
    if (s.includes('hoy')) return today;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    return today;
}

function normalizeHumanTimeToHHMM(t) {
    if (!t) return null;
    let s = String(t).toLowerCase().replace(/\s+/g, '').replace(/dela|de|la/g, '');
    const m = s.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|mañana|tarde|noche)?$/);
    if (!m) {
        const basic = s.match(/^(\d{1,2}):?(\d{2})$/);
        if (basic) return `${String(basic[1]).padStart(2, '0')}:${basic[2]}`;
        return null;
    }
    let h = parseInt(m[1], 10);
    let mm = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3];
    if (!ampm && h >= 1 && h <= 6) h += 12;
    if ((ampm === 'pm' || ampm === 'tarde' || ampm === 'noche') && h < 12) h += 12;
    if ((ampm === 'am' || ampm === 'mañana') && h === 12) h = 0;
    return `${String(Math.min(23, h)).padStart(2, '0')}:${String(Math.min(59, mm)).padStart(2, '0')}`;
}

function makeLocalUtc(dateStr, timeStr) {
    const t = (timeStr && timeStr.length === 5) ? `${timeStr}:00` : (timeStr || '00:00:00');
    return zonedTimeToUtc(`${dateStr} ${t}`, TIME_ZONE);
}

function getPeriodDays(periodo) {
    const p = String(periodo || 'mes').toLowerCase();
    if (p.includes('semana')) return 7;
    if (p.includes('año') || p.includes('anual')) return 365;
    return 30; // mes por defecto
}

// ==================== SYSTEM PROMPT ====================

const ADMIN_SYSTEM_PROMPT = `Eres el asistente de inteligencia de negocio de TuPelukeria. Hablas con el JEFE — el dueño, administrador o recepcionista del salón por WhatsApp.

PERSONALIDAD (MUY IMPORTANTE):
- Siempre tratas al usuario como "jefe". Es tu forma natural de dirigirte a él.
- Al saludar o cuando te hablen por primera vez, responde: "Hola jefe 👋"
- Cuando te pidan hacer cambios o ejecutar acciones, confirma con actitud de servicio: "Como ordene jefe", "Listo jefe", "A la orden jefe", "Claro que sí jefe".
- Cuando reportes datos o respondas consultas: "Mire jefe, aquí le tengo...", "Jefe, esto es lo que encontré...", "Aquí tiene jefe..."
- Cuando confirmes algo exitoso: "Listo jefe, ya quedó", "Hecho jefe ✅", "Ya le dejé eso listo jefe"
- Eres leal, eficiente y siempre dispuesto. Como un asistente de confianza que respeta y sirve al jefe con buena actitud.

ROL:
- Consultar y gestionar: agenda, fichero digital, estilistas, servicios, productos, ventas, promociones, geolocalización y configuración del salón.
- Dar respuestas concisas con datos reales. Usa tablas o listas cuando haya varios registros.
- Si el usuario pide CREAR algo (cita, servicio, producto, estilista, promoción), SIEMPRE confirma los datos antes de ejecutar la función de creación. Ejemplo: "Jefe, voy a crear el servicio Corte Clásico a $25.000 (30 min). ¿Le doy?"
- NUNCA inventes datos. Si una función devuelve resultados vacíos, dilo claramente: "Jefe, no encontré nada con esos datos."

CREACIÓN DE ESTILISTAS - DATOS REQUERIDOS:
- Cuando el jefe quiera agregar un estilista, necesitas estos datos MÍNIMOS:
  1. Nombre completo (nombre y apellido)
  2. Email
  3. Porcentaje de comisión (ej: 40%, 50%)
  4. Tipo de pago: 'commission' (solo comisión), 'salary' (solo salario), 'mixed' (salario + comisión)
- Si falta alguno de estos datos, PREGUNTA al jefe antes de crear. Ejemplo: "Jefe, ¿cuál será el porcentaje de comisión de Carlos?"
- Datos opcionales: teléfono, salario base (si tipo_pago es 'salary' o 'mixed'), horario laboral.

CONFIGURACIÓN DEL SALÓN:
- El jefe puede configurar horarios, información del salón, etc. mediante conversación natural.
- Si dice "mi horario es de lunes a viernes de 8 a 6", usa configurar_horario_salon con dias="lunes,martes,miercoles,jueves,viernes", hora_inicio="8", hora_fin="18". Confirma brevemente y EJECUTA.
- Si dice "quiero cambiar el nombre" o "actualizar la dirección", usa actualizar_info_salon.
- Si dice "ver configuración" o "cómo está configurado", usa ver_configuracion_salon.

HORARIOS DE ESTILISTAS:
- El jefe puede cambiar el horario de un estilista individual. Ejemplos:
  * "Carlos ya no trabaja los lunes" → usa modificar_horario_estilista con estilista="Carlos", dias="lunes", accion="quitar_dia"
  * "María va a trabajar martes de 2 a 5" → usa modificar_horario_estilista con estilista="María", dias="martes", hora_inicio="14", hora_fin="17", accion="agregar_dia"
  * "Pedro trabaja de lunes a viernes de 8 a 6" → usa modificar_horario_estilista con estilista="Pedro", dias="lunes,martes,miercoles,jueves,viernes", hora_inicio="8", hora_fin="18", accion="actualizar"
  * "¿Cuál es el horario de Carlos?" → usa ver_horario_estilista

EJECUCIÓN DE FUNCIONES - MUY IMPORTANTE:
- Cuando el jefe confirme un cambio (dice "sí", "dale", "hazlo", "correcto"), EJECUTA la función INMEDIATAMENTE. No pidas más confirmaciones.
- Cuando el jefe diga "cambia mi horario de 8 a 5" y ya sabes los días, EJECUTA la función directamente.
- NUNCA pidas confirmación más de UNA vez. Si el jefe ya dijo "sí", ejecuta.
- SIEMPRE llena TODOS los parámetros requeridos de la función. Si te dice "de 8 a 5pm", hora_inicio="8", hora_fin="17".

FORMATO DE RESPUESTAS PARA VOZ (MUY IMPORTANTE):
- Cuando reportes ventas o cifras monetarias, formatea de manera CLARA y CONVERSACIONAL:
  * En vez de "$300.000" di "trescientos mil pesos" o "300 mil pesos"
  * En vez de "$1.500.000" di "un millón quinientos mil" o "millón y medio"
  * Desglosa SIEMPRE por método de pago: "jefe, llevas X en total: Y en efectivo, Z en tarjeta y W en transferencias"
  * Para productos: "jefe, el producto más vendido es [nombre] con X unidades"
- Esto es ESPECIALMENTE importante para que las respuestas por voz (TTS) sean claras y naturales.
- Para ventas usa frases como: "Jefe, hoy llevas 300 mil pesos, mire: 100 mil en efectivo, 150 mil en tarjetas y 50 mil en canjes"

CAMPAÑAS DE EMAIL:
- El jefe puede enviar campañas de email a clientes inactivos.
- Cuando pida enviar una campaña, usa enviar_campana_inactivos. SIEMPRE envía prueba primero (enviar_prueba=true).
- Sugiere un periodo si no lo dice: "Jefe, ¿de cuántos días quiere buscar inactivos? Le sugiero 30 días."
- Plantillas disponibles: te_extranamos, descuento, nuevo_servicio.
- Flujo: 1) Buscar inactivos → 2) Enviar prueba al admin → 3) Si confirma, enviar a todos (enviar_prueba=false).

ESTILO:
- Español colombiano profesional pero cercano y respetuoso. Siempre dices "jefe".
- Respuestas directas con datos. Nada de relleno.
- Usa formato con negritas, listas y emojis moderados para claridad en texto.
- Cuando muestres precios en texto, usa formato colombiano: $25.000
- Cuando la respuesta vaya a ser leída por voz, usa formato hablado natural.

CONTEXTO TEMPORAL:
- Zona horaria: America/Bogota (UTC-5).
- Fecha/hora actual las obtienes del sistema.`;

// ==================== 18 FUNCIONES (TOOLS) ====================

const ADMIN_TOOLS = [
    // 1. ver_citas_hoy
    {
        type: "function",
        function: {
            name: "ver_citas_hoy",
            description: "Muestra todas las citas programadas para hoy con detalle de servicio, estilista, cliente y hora.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 2. ver_agenda_fecha
    {
        type: "function",
        function: {
            name: "ver_agenda_fecha",
            description: "Muestra las citas para una fecha específica.",
            parameters: {
                type: "object",
                properties: {
                    fecha: { type: "string", description: "Fecha: 'hoy', 'mañana' o YYYY-MM-DD" }
                },
                required: ["fecha"]
            }
        }
    },
    // 3. crear_cita
    {
        type: "function",
        function: {
            name: "crear_cita",
            description: "Crea una nueva cita. Solo usar cuando el admin haya confirmado todos los datos.",
            parameters: {
                type: "object",
                properties: {
                    servicio: { type: "string", description: "Nombre del servicio" },
                    fecha: { type: "string", description: "Fecha: 'hoy', 'mañana' o YYYY-MM-DD" },
                    hora: { type: "string", description: "Hora: '3pm', '15:00', '10am'" },
                    estilista: { type: "string", description: "Nombre del estilista (opcional)" },
                    cliente: { type: "string", description: "Nombre del cliente (opcional, busca por nombre)" }
                },
                required: ["servicio", "fecha", "hora"]
            }
        }
    },
    // 4. ver_fichero_digital
    {
        type: "function",
        function: {
            name: "ver_fichero_digital",
            description: "Muestra el fichero digital (digiturno): estilistas con sus servicios y conteo de atenciones completadas.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 5. clientes_atendidos_hoy
    {
        type: "function",
        function: {
            name: "clientes_atendidos_hoy",
            description: "Cuántos clientes se han atendido hoy y qué servicios se realizaron.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 6. ver_ubicacion_estilistas
    {
        type: "function",
        function: {
            name: "ver_ubicacion_estilistas",
            description: "Muestra qué estilistas están dentro del salón según geolocalización.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 7. listar_servicios
    {
        type: "function",
        function: {
            name: "listar_servicios",
            description: "Lista todos los servicios con precio, duración y comisión.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 8. servicios_mas_populares
    {
        type: "function",
        function: {
            name: "servicios_mas_populares",
            description: "Ranking de servicios más solicitados por citas completadas en un periodo.",
            parameters: {
                type: "object",
                properties: {
                    periodo: { type: "string", description: "'semana', 'mes' o 'año'. Default: mes" }
                },
                required: []
            }
        }
    },
    // 9. crear_servicio
    {
        type: "function",
        function: {
            name: "crear_servicio",
            description: "Crea un nuevo servicio. Solo usar cuando el admin haya confirmado los datos.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string", description: "Nombre del servicio" },
                    precio: { type: "number", description: "Precio en COP (ej: 25000)" },
                    duracion_minutos: { type: "integer", description: "Duración en minutos (ej: 30)" },
                    comision: { type: "number", description: "Porcentaje de comisión 0-100 (opcional)" }
                },
                required: ["nombre", "precio", "duracion_minutos"]
            }
        }
    },
    // 10. listar_estilistas
    {
        type: "function",
        function: {
            name: "listar_estilistas",
            description: "Lista todos los estilistas activos del salón.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 11. crear_estilista
    {
        type: "function",
        function: {
            name: "crear_estilista",
            description: "Registra un nuevo estilista. ANTES de crear, asegúrate de tener: nombre, apellido, email y porcentaje de comisión. Si falta algún dato, pregunta al admin.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string", description: "Primer nombre" },
                    apellido: { type: "string", description: "Apellido" },
                    email: { type: "string", description: "Email del estilista" },
                    telefono: { type: "string", description: "Teléfono (opcional)" },
                    porcentaje_comision: { type: "number", description: "Porcentaje de comisión 0-100 (ej: 40, 50)" },
                    tipo_pago: { type: "string", enum: ["commission", "salary", "mixed"], description: "Tipo de pago: 'commission' (solo comisión), 'salary' (solo salario), 'mixed' (salario + comisión). Default: commission" },
                    salario_base: { type: "number", description: "Salario base en COP (solo si tipo_pago es 'salary' o 'mixed')" },
                    horario: {
                        type: "object",
                        description: "Horario laboral. Ej: {\"lunes\": {\"start\": \"8\", \"end\": \"18\"}}. Si no se da, se usa el del salón."
                    }
                },
                required: ["nombre", "apellido", "email"]
            }
        }
    },
    // 12. listar_productos
    {
        type: "function",
        function: {
            name: "listar_productos",
            description: "Lista productos activos con stock y precio de venta.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 13. productos_mas_vendidos
    {
        type: "function",
        function: {
            name: "productos_mas_vendidos",
            description: "Ranking de productos más vendidos en un periodo.",
            parameters: {
                type: "object",
                properties: {
                    periodo: { type: "string", description: "'semana', 'mes' o 'año'. Default: mes" }
                },
                required: []
            }
        }
    },
    // 14. crear_producto
    {
        type: "function",
        function: {
            name: "crear_producto",
            description: "Crea un nuevo producto. Solo usar cuando el admin haya confirmado los datos.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string", description: "Nombre del producto" },
                    precio_venta: { type: "number", description: "Precio de venta en COP" },
                    precio_costo: { type: "number", description: "Precio de costo (opcional)" },
                    stock: { type: "integer", description: "Stock inicial (opcional, default 0)" }
                },
                required: ["nombre", "precio_venta"]
            }
        }
    },
    // 15. listar_promociones
    {
        type: "function",
        function: {
            name: "listar_promociones",
            description: "Lista las promociones del salón (activas e inactivas).",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 16. crear_promocion
    {
        type: "function",
        function: {
            name: "crear_promocion",
            description: "Crea una nueva promoción. Solo usar cuando el admin haya confirmado los datos.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string", description: "Nombre de la promoción" },
                    descripcion: { type: "string", description: "Descripción (opcional)" },
                    tipo_descuento: { type: "string", enum: ["percentage", "fixed_amount"], description: "'percentage' o 'fixed_amount'" },
                    valor: { type: "number", description: "Valor del descuento (porcentaje 0-100 o monto fijo en COP)" },
                    aplica_a: { type: "string", enum: ["all", "service", "product"], description: "'all', 'service' o 'product' (default: all)" },
                    fecha_inicio: { type: "string", description: "Fecha inicio YYYY-MM-DD (opcional)" },
                    fecha_fin: { type: "string", description: "Fecha fin YYYY-MM-DD (opcional)" }
                },
                required: ["nombre", "tipo_descuento", "valor"]
            }
        }
    },
    // 17. resumen_ventas_dia
    {
        type: "function",
        function: {
            name: "resumen_ventas_dia",
            description: "Resumen de ventas de hoy o una fecha: total facturado, desglose servicios vs productos.",
            parameters: {
                type: "object",
                properties: {
                    fecha: { type: "string", description: "Fecha: 'hoy', 'mañana' o YYYY-MM-DD. Default: hoy" }
                },
                required: []
            }
        }
    },
    // 18. rendimiento_estilistas
    {
        type: "function",
        function: {
            name: "rendimiento_estilistas",
            description: "Rendimiento de estilistas: citas completadas, ingresos generados y comisión en un periodo.",
            parameters: {
                type: "object",
                properties: {
                    periodo: { type: "string", description: "'semana', 'mes' o 'año'. Default: mes" }
                },
                required: []
            }
        }
    },
    // 19. configurar_horario_salon
    {
        type: "function",
        function: {
            name: "configurar_horario_salon",
            description: "Configura el horario de atención del salón. Usa 'dias' para indicar los días que trabaja y hora_inicio/hora_fin para el horario.",
            parameters: {
                type: "object",
                properties: {
                    dias: {
                        type: "string",
                        description: "Días separados por coma. Ej: 'lunes,martes,miercoles,jueves,viernes' o 'lunes,martes,miercoles,jueves,viernes,sabado'"
                    },
                    hora_inicio: {
                        type: "string",
                        description: "Hora de apertura. Ej: '8', '9', '10'"
                    },
                    hora_fin: {
                        type: "string",
                        description: "Hora de cierre. Ej: '17', '18', '20'"
                    }
                },
                required: ["dias", "hora_inicio", "hora_fin"]
            }
        }
    },
    // 20. actualizar_info_salon
    {
        type: "function",
        function: {
            name: "actualizar_info_salon",
            description: "Actualiza información general del salón: nombre, dirección, teléfono, email, sitio web.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string", description: "Nombre del salón" },
                    direccion: { type: "string", description: "Dirección del salón" },
                    ciudad: { type: "string", description: "Ciudad donde se encuentra el salón" },
                    telefono: { type: "string", description: "Teléfono del salón" },
                    email: { type: "string", description: "Email del salón" },
                    sitio_web: { type: "string", description: "Sitio web del salón" }
                },
                required: []
            }
        }
    },
    // 21. ver_configuracion_salon
    {
        type: "function",
        function: {
            name: "ver_configuracion_salon",
            description: "Muestra la configuración actual del salón: nombre, dirección, horarios, teléfono, etc.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 22. modificar_horario_estilista
    {
        type: "function",
        function: {
            name: "modificar_horario_estilista",
            description: "Modifica el horario laboral de un estilista. Ejemplos: 'Carlos ya no trabaja los lunes' → accion='quitar_dia', dias='lunes'. 'María trabaja martes de 2 a 5' → accion='agregar_dia', dias='martes', hora_inicio='14', hora_fin='17'. 'Pedro trabaja lunes a viernes de 8 a 6' → accion='actualizar', dias='lunes,martes,miercoles,jueves,viernes', hora_inicio='8', hora_fin='18'.",
            parameters: {
                type: "object",
                properties: {
                    estilista: { type: "string", description: "Nombre del estilista" },
                    dias: { type: "string", description: "Días separados por coma. Ej: 'lunes,martes,miercoles'" },
                    hora_inicio: { type: "string", description: "Hora inicio. Ej: '8', '14'. No requerido para quitar_dia." },
                    hora_fin: { type: "string", description: "Hora fin. Ej: '17', '18'. No requerido para quitar_dia." },
                    accion: { type: "string", enum: ["actualizar", "quitar_dia", "agregar_dia"], description: "'actualizar' para set completo, 'quitar_dia' para remover días, 'agregar_dia' para agregar días con horario" }
                },
                required: ["estilista", "dias", "accion"]
            }
        }
    },
    // 23. ver_horario_estilista
    {
        type: "function",
        function: {
            name: "ver_horario_estilista",
            description: "Muestra el horario laboral actual de un estilista específico.",
            parameters: {
                type: "object",
                properties: {
                    estilista: { type: "string", description: "Nombre del estilista" }
                },
                required: ["estilista"]
            }
        }
    },
    // 24. generar_nomina
    {
        type: "function",
        function: {
            name: "generar_nomina",
            description: "Genera y guarda la nómina de un estilista para un período específico. Calcula comisiones, deduce anticipos, cuotas de préstamos y compras de staff. Retorna el desglose completo.",
            parameters: {
                type: "object",
                properties: {
                    estilista: { type: "string", description: "Nombre del estilista" },
                    fecha_inicio: { type: "string", description: "Fecha inicio en formato YYYY-MM-DD (ej: 2026-02-01)" },
                    fecha_fin: { type: "string", description: "Fecha fin en formato YYYY-MM-DD (ej: 2026-02-28)" }
                },
                required: ["estilista", "fecha_inicio", "fecha_fin"]
            }
        }
    },
    // 25. ver_preview_nomina
    {
        type: "function",
        function: {
            name: "ver_preview_nomina",
            description: "Muestra una vista previa de la nómina de un estilista SIN guardarla. Útil para revisar antes de generar.",
            parameters: {
                type: "object",
                properties: {
                    estilista: { type: "string", description: "Nombre del estilista (o 'todos' para ver todos)" },
                    fecha_inicio: { type: "string", description: "Fecha inicio YYYY-MM-DD" },
                    fecha_fin: { type: "string", description: "Fecha fin YYYY-MM-DD" }
                },
                required: ["fecha_inicio", "fecha_fin"]
            }
        }
    },
    // 26. enviar_campana_inactivos
    {
        type: "function",
        function: {
            name: "enviar_campana_inactivos",
            description: "Crea y envía una campaña de email a clientes inactivos. Primero envía una prueba al email del admin.",
            parameters: {
                type: "object",
                properties: {
                    dias_inactividad: { type: "integer", description: "Días sin visitar (default 30)" },
                    plantilla: { type: "string", enum: ["te_extranamos", "descuento", "nuevo_servicio"], description: "Tipo de plantilla: te_extranamos, descuento, nuevo_servicio" },
                    asunto: { type: "string", description: "Asunto del email (opcional, se auto-genera)" },
                    enviar_prueba: { type: "boolean", description: "Si true (default), solo envía prueba al admin. Si false, envía a todos." }
                },
                required: ["dias_inactividad"]
            }
        }
    }
];

// ==================== EJECUTORES DE FUNCIONES ====================

async function executeFunction(fnName, args, tenantId) {
    switch (fnName) {

        // 1. ver_citas_hoy
        case 'ver_citas_hoy': {
            const today = normalizeDateKeyword('hoy');
            const startUtc = makeLocalUtc(today, '00:00');
            const endUtc = makeLocalUtc(today, '23:59');
            const rows = await prisma.$queryRawUnsafe(`
                SELECT a.id, a.start_time, a.end_time, a.status,
                       s.name AS servicio, s.price AS precio,
                       CONCAT(st.first_name, ' ', st.last_name) AS estilista,
                       CONCAT(cl.first_name, ' ', cl.last_name) AS cliente
                FROM appointments a
                LEFT JOIN services s ON a.service_id = s.id
                LEFT JOIN users st ON a.stylist_id = st.id
                LEFT JOIN users cl ON a.client_id = cl.id
                WHERE a.tenant_id = $1::uuid
                  AND a.start_time >= $2::timestamptz AND a.start_time <= $3::timestamptz
                  AND a.status != 'cancelled'
                ORDER BY a.start_time
            `, tenantId, startUtc, endUtc);
            return {
                fecha: today,
                total_citas: rows.length,
                citas: rows.map(r => ({
                    hora: formatInTimeZone(r.start_time, TIME_ZONE, 'hh:mm a'),
                    servicio: r.servicio,
                    precio: r.precio,
                    estilista: r.estilista,
                    cliente: r.cliente || 'Sin asignar',
                    estado: r.status
                }))
            };
        }

        // 2. ver_agenda_fecha
        case 'ver_agenda_fecha': {
            const fecha = normalizeDateKeyword(args.fecha);
            const startUtc = makeLocalUtc(fecha, '00:00');
            const endUtc = makeLocalUtc(fecha, '23:59');
            const rows = await prisma.$queryRawUnsafe(`
                SELECT a.id, a.start_time, a.end_time, a.status,
                       s.name AS servicio, s.price AS precio,
                       CONCAT(st.first_name, ' ', st.last_name) AS estilista,
                       CONCAT(cl.first_name, ' ', cl.last_name) AS cliente
                FROM appointments a
                LEFT JOIN services s ON a.service_id = s.id
                LEFT JOIN users st ON a.stylist_id = st.id
                LEFT JOIN users cl ON a.client_id = cl.id
                WHERE a.tenant_id = $1::uuid
                  AND a.start_time >= $2::timestamptz AND a.start_time <= $3::timestamptz
                  AND a.status != 'cancelled'
                ORDER BY a.start_time
            `, tenantId, startUtc, endUtc);
            return {
                fecha,
                total_citas: rows.length,
                citas: rows.map(r => ({
                    hora: formatInTimeZone(r.start_time, TIME_ZONE, 'hh:mm a'),
                    servicio: r.servicio,
                    precio: r.precio,
                    estilista: r.estilista,
                    cliente: r.cliente || 'Sin asignar',
                    estado: r.status
                }))
            };
        }

        // 3. crear_cita
        case 'crear_cita': {
            const fecha = normalizeDateKeyword(args.fecha);
            const hora = normalizeHumanTimeToHHMM(args.hora);
            if (!hora) return { error: 'No pude interpretar la hora. Usa formato como 3pm o 15:00.' };

            // Buscar servicio
            const svcRows = await prisma.$queryRawUnsafe(`
                SELECT id, name, duration_minutes FROM services
                WHERE tenant_id = $1::uuid AND LOWER(name) LIKE $2
                LIMIT 1
            `, tenantId, `%${args.servicio.toLowerCase()}%`);
            if (!svcRows.length) return { error: `No encontré el servicio "${args.servicio}".` };
            const svc = svcRows[0];

            // Buscar estilista (opcional)
            let stylistId = null;
            let stylistWorkingHours = null;
            let stylistName = null;
            if (args.estilista) {
                const stRows = await prisma.$queryRawUnsafe(`
                    SELECT id, first_name, last_name, working_hours FROM users
                    WHERE tenant_id = $1::uuid AND role_id = 3
                      AND COALESCE(NULLIF(status,''),'active') = 'active'
                      AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2
                           OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2)
                    LIMIT 1
                `, tenantId, `%${args.estilista.toLowerCase()}%`);
                if (stRows.length) {
                    stylistId = stRows[0].id;
                    stylistWorkingHours = stRows[0].working_hours;
                    stylistName = `${stRows[0].first_name} ${stRows[0].last_name || ''}`.trim();
                }
            }
            // Si no se especificó estilista, buscar uno que ofrezca el servicio
            if (!stylistId) {
                const anyStRows = await prisma.$queryRawUnsafe(`
                    SELECT u.id AS user_id, u.working_hours, u.first_name, u.last_name FROM stylist_services ss
                    JOIN users u ON ss.user_id = u.id
                    WHERE u.tenant_id = $1::uuid AND ss.service_id = $2::uuid
                      AND COALESCE(NULLIF(u.status,''),'active') = 'active'
                    LIMIT 1
                `, tenantId, svc.id);
                if (anyStRows.length) {
                    stylistId = anyStRows[0].user_id;
                    stylistWorkingHours = anyStRows[0].working_hours;
                    stylistName = `${anyStRows[0].first_name} ${anyStRows[0].last_name || ''}`.trim();
                }
            }
            if (!stylistId) return { error: 'No hay estilista disponible para ese servicio.' };

            // Buscar cliente (opcional)
            let clientId = null;
            if (args.cliente) {
                const clRows = await prisma.$queryRawUnsafe(`
                    SELECT id FROM users
                    WHERE tenant_id = $1::uuid
                      AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2
                           OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2)
                    LIMIT 1
                `, tenantId, `%${args.cliente.toLowerCase()}%`);
                if (clRows.length) clientId = clRows[0].id;
            }

            const startTime = makeLocalUtc(fecha, hora);
            const endTime = new Date(startTime.getTime() + svc.duration_minutes * 60 * 1000);

            // Verificar horario laboral del estilista
            if (stylistWorkingHours) {
                try {
                    const wh = typeof stylistWorkingHours === 'string' ? JSON.parse(stylistWorkingHours) : stylistWorkingHours;
                    const isoDay = parseInt(formatInTimeZone(startTime, TIME_ZONE, 'i'), 10);
                    const dayOfWeek = isoDay === 7 ? 0 : isoDay;
                    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                    const dayKey = dayNames[dayOfWeek];
                    const horaNum = parseInt(hora.split(':')[0], 10);

                    if (!wh[dayKey]) {
                        return { error: `${stylistName || 'El estilista'} no trabaja los ${dayKey}. Elige otro día u otro estilista.` };
                    }
                    const { start, end } = wh[dayKey];
                    const startWork = parseInt(start, 10);
                    const endWork = parseInt(end, 10);
                    if (horaNum < startWork || horaNum >= endWork) {
                        return { error: `${stylistName || 'El estilista'} no trabaja a las ${hora}. Su horario los ${dayKey} es de ${start}:00 a ${end}:00.` };
                    }
                } catch (whErr) {
                    console.warn('⚠️ Error validando working_hours en crear_cita admin:', whErr.message);
                }
            }

            // Verificar conflictos
            const conflicts = await prisma.$queryRawUnsafe(`
                SELECT id FROM appointments
                WHERE tenant_id = $1::uuid AND stylist_id = $2::uuid
                  AND status IN ('scheduled', 'rescheduled', 'checked_in')
                  AND (start_time, end_time) OVERLAPS ($3::timestamptz, $4::timestamptz)
                LIMIT 1
            `, tenantId, stylistId, startTime, endTime);
            if (conflicts.length) return { error: 'El estilista ya tiene una cita en ese horario.' };

            const newAppt = await prisma.$queryRawUnsafe(`
                INSERT INTO appointments (tenant_id, client_id, stylist_id, service_id, start_time, end_time, status)
                VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, 'scheduled')
                RETURNING id
            `, tenantId, clientId, stylistId, svc.id, startTime, endTime);

            return {
                success: true,
                cita_id: newAppt[0].id,
                servicio: svc.name,
                fecha,
                hora,
                mensaje: `Cita creada exitosamente para ${svc.name} el ${fecha} a las ${hora}.`
            };
        }

        // 4. ver_fichero_digital
        case 'ver_fichero_digital': {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) AS estilista,
                       s.name AS servicio,
                       ss.total_completed,
                       ss.last_completed_at
                FROM stylist_services ss
                JOIN users u ON ss.user_id = u.id
                JOIN services s ON ss.service_id = s.id
                WHERE u.tenant_id = $1::uuid AND u.role_id = 3
                  AND COALESCE(NULLIF(u.status,''),'active') = 'active'
                ORDER BY u.first_name, ss.total_completed DESC
            `, tenantId);
            return { fichero: rows };
        }

        // 5. clientes_atendidos_hoy
        case 'clientes_atendidos_hoy': {
            const today = normalizeDateKeyword('hoy');
            const startUtc = makeLocalUtc(today, '00:00');
            const endUtc = makeLocalUtc(today, '23:59');
            const rows = await prisma.$queryRawUnsafe(`
                SELECT COUNT(DISTINCT a.client_id) AS clientes,
                       COUNT(*) AS total_citas,
                       ARRAY_AGG(DISTINCT s.name) AS servicios
                FROM appointments a
                LEFT JOIN services s ON a.service_id = s.id
                WHERE a.tenant_id = $1::uuid
                  AND a.start_time >= $2::timestamptz AND a.start_time <= $3::timestamptz
                  AND a.status IN ('completed', 'checked_out')
            `, tenantId, startUtc, endUtc);
            const r = rows[0];
            return {
                fecha: today,
                clientes_atendidos: parseInt(r.clientes) || 0,
                citas_completadas: parseInt(r.total_citas) || 0,
                servicios_realizados: (r.servicios || []).filter(Boolean)
            };
        }

        // 6. ver_ubicacion_estilistas
        case 'ver_ubicacion_estilistas': {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT CONCAT(first_name, ' ', last_name) AS estilista,
                       is_inside_geofence,
                       last_location_update
                FROM users
                WHERE tenant_id = $1::uuid AND role_id = 3
                  AND COALESCE(NULLIF(status,''),'active') = 'active'
                ORDER BY first_name
            `, tenantId);
            const dentro = rows.filter(r => r.is_inside_geofence === true);
            const fuera = rows.filter(r => r.is_inside_geofence !== true);
            return {
                en_salon: dentro.map(r => ({
                    estilista: r.estilista,
                    ultima_ubicacion: r.last_location_update
                        ? formatInTimeZone(r.last_location_update, TIME_ZONE, 'hh:mm a')
                        : 'Sin datos'
                })),
                fuera_salon: fuera.map(r => ({
                    estilista: r.estilista,
                    ultima_ubicacion: r.last_location_update
                        ? formatInTimeZone(r.last_location_update, TIME_ZONE, 'hh:mm a')
                        : 'Sin datos'
                })),
                total_dentro: dentro.length,
                total_fuera: fuera.length
            };
        }

        // 7. listar_servicios
        case 'listar_servicios': {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT id, name, price, duration_minutes, commission_percent
                FROM services
                WHERE tenant_id = $1::uuid
                ORDER BY name
            `, tenantId);
            return { total: rows.length, servicios: rows };
        }

        // 8. servicios_mas_populares
        case 'servicios_mas_populares': {
            const days = getPeriodDays(args.periodo);
            const rows = await prisma.$queryRawUnsafe(`
                SELECT s.name AS servicio, COUNT(*) AS total_citas, SUM(s.price) AS ingresos
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                WHERE a.tenant_id = $1::uuid
                  AND a.status IN ('completed', 'checked_out')
                  AND a.start_time >= NOW() - INTERVAL '1 day' * $2::int
                GROUP BY s.name
                ORDER BY total_citas DESC
                LIMIT 10
            `, tenantId, days);
            return { periodo: args.periodo || 'mes', ranking: rows };
        }

        // 9. crear_servicio
        case 'crear_servicio': {
            const rows = await prisma.$queryRawUnsafe(`
                INSERT INTO services (tenant_id, name, price, duration_minutes, commission_percent)
                VALUES ($1::uuid, $2, $3, $4, $5)
                RETURNING id, name, price, duration_minutes
            `, tenantId, args.nombre, args.precio, args.duracion_minutos, args.comision || 0);
            return { success: true, servicio: rows[0] };
        }

        // 10. listar_estilistas
        case 'listar_estilistas': {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT id, first_name, last_name, email, phone,
                       commission_rate, is_inside_geofence
                FROM users
                WHERE tenant_id = $1::uuid AND role_id = 3
                  AND COALESCE(NULLIF(status,''),'active') = 'active'
                ORDER BY first_name
            `, tenantId);
            return {
                total: rows.length,
                estilistas: rows.map(r => ({
                    id: r.id,
                    nombre: `${r.first_name} ${r.last_name}`,
                    email: r.email,
                    telefono: r.phone,
                    comision: r.commission_rate,
                    en_salon: r.is_inside_geofence || false
                }))
            };
        }

        // 11. crear_estilista
        case 'crear_estilista': {
            const bcrypt = require('bcryptjs');
            const tempPass = 'Temp' + Math.random().toString(36).slice(2, 8) + '!';
            const hashedPass = await bcrypt.hash(tempPass, 10);

            const commissionRate = args.porcentaje_comision ? (args.porcentaje_comision / 100) : 0;
            const paymentType = args.tipo_pago || 'commission';
            const baseSalary = args.salario_base || 0;
            const workingHoursJson = args.horario ? JSON.stringify(args.horario) : null;

            const { rows } = await db.query(`
                INSERT INTO users (tenant_id, first_name, last_name, email, phone, password_hash, role_id, status, commission_rate, payment_type, base_salary, working_hours)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, 3, 'active', $7, $8, $9, $10::jsonb)
                RETURNING id, first_name, last_name, email
            `, [tenantId, args.nombre, args.apellido, args.email, args.telefono || null, hashedPass,
                commissionRate, paymentType, baseSalary, workingHoursJson]);
            return {
                success: true,
                estilista: rows[0],
                comision: `${args.porcentaje_comision || 0}%`,
                tipo_pago: paymentType,
                salario_base: baseSalary,
                password_temporal: tempPass,
                mensaje: `Estilista ${args.nombre} ${args.apellido} creado. Comisión: ${args.porcentaje_comision || 0}%. Password temporal: ${tempPass}`
            };
        }

        // 12. listar_productos
        case 'listar_productos': {
            const { rows } = await db.query(`
                SELECT id, name, sale_price, cost_price, stock, is_active
                FROM products
                WHERE tenant_id = $1::uuid AND is_active = true
                ORDER BY name
            `, [tenantId]);
            return { total: rows.length, productos: rows };
        }

        // 13. productos_mas_vendidos
        case 'productos_mas_vendidos': {
            const days = getPeriodDays(args.periodo);
            const { rows } = await db.query(`
                SELECT ii.description AS producto,
                       SUM(ii.quantity) AS unidades_vendidas,
                       SUM(ii.total_price) AS ingresos
                FROM invoice_items ii
                JOIN invoices i ON ii.invoice_id = i.id
                WHERE ii.tenant_id = $1::uuid
                  AND ii.item_type = 'product'
                  AND i.created_at >= NOW() - INTERVAL '1 day' * $2::int
                GROUP BY ii.description
                ORDER BY unidades_vendidas DESC
                LIMIT 10
            `, [tenantId, days]);
            return { periodo: args.periodo || 'mes', ranking: rows };
        }

        // 14. crear_producto
        case 'crear_producto': {
            const { rows } = await db.query(`
                INSERT INTO products (tenant_id, name, sale_price, cost_price, stock, is_active)
                VALUES ($1::uuid, $2, $3, $4, $5, true)
                RETURNING id, name, sale_price, stock
            `, [tenantId, args.nombre, args.precio_venta, args.precio_costo || 0, args.stock || 0]);
            return { success: true, producto: rows[0] };
        }

        // 15. listar_promociones
        case 'listar_promociones': {
            const { rows } = await db.query(`
                SELECT id, name, description, discount_type, discount_value,
                       applies_to, start_date, end_date, is_active
                FROM promotions
                WHERE tenant_id = $1::uuid
                ORDER BY is_active DESC, created_at DESC
            `, [tenantId]);
            return { total: rows.length, promociones: rows };
        }

        // 16. crear_promocion
        case 'crear_promocion': {
            const { rows } = await db.query(`
                INSERT INTO promotions (tenant_id, name, description, discount_type, discount_value, applies_to, start_date, end_date)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, discount_type, discount_value, applies_to, start_date, end_date
            `, [
                tenantId,
                args.nombre,
                args.descripcion || null,
                args.tipo_descuento,
                args.valor,
                args.aplica_a || 'all',
                args.fecha_inicio || null,
                args.fecha_fin || null
            ]);
            return { success: true, promocion: rows[0] };
        }

        // 17. resumen_ventas_dia
        case 'resumen_ventas_dia': {
            const fecha = normalizeDateKeyword(args.fecha);
            const startUtc = makeLocalUtc(fecha, '00:00');
            const endUtc = makeLocalUtc(fecha, '23:59');

            // Query 1: Totales por tipo de item
            const { rows } = await db.query(`
                SELECT
                    COALESCE(SUM(ii.total_price), 0) AS total_facturado,
                    COALESCE(SUM(CASE WHEN ii.item_type = 'service' THEN ii.total_price ELSE 0 END), 0) AS total_servicios,
                    COALESCE(SUM(CASE WHEN ii.item_type = 'product' THEN ii.total_price ELSE 0 END), 0) AS total_productos,
                    COUNT(DISTINCT i.id) AS facturas,
                    COALESCE(SUM(ii.commission_value), 0) AS total_comisiones
                FROM invoice_items ii
                JOIN invoices i ON ii.invoice_id = i.id
                WHERE ii.tenant_id = $1::uuid
                  AND i.created_at >= $2::timestamptz AND i.created_at <= $3::timestamptz
            `, [tenantId, startUtc, endUtc]);

            // Query 2: Desglose por método de pago
            const paymentBreakdown = await db.query(`
                SELECT
                    COALESCE(p.payment_method, 'otro') AS metodo,
                    COALESCE(SUM(p.amount), 0) AS total
                FROM payments p
                JOIN invoices i ON p.invoice_id = i.id
                WHERE i.tenant_id = $1::uuid
                  AND p.payment_date >= $2::timestamptz AND p.payment_date <= $3::timestamptz
                GROUP BY p.payment_method
                ORDER BY total DESC
            `, [tenantId, startUtc, endUtc]);

            const desglose_metodo_pago = {};
            for (const row of paymentBreakdown.rows) {
                const metodo = row.metodo === 'cash' ? 'efectivo' :
                               row.metodo === 'card' ? 'tarjeta' :
                               row.metodo === 'transfer' ? 'transferencia' :
                               row.metodo === 'exchange' ? 'canje' : row.metodo;
                desglose_metodo_pago[metodo] = row.total;
            }

            return {
                fecha,
                ...rows[0],
                desglose_metodo_pago,
                nota_formato: 'Presenta los valores de forma conversacional. Ej: "Hoy llevas 300 mil pesos: 100 mil en efectivo, 150 mil en tarjetas y 50 mil en canjes"'
            };
        }

        // 18. rendimiento_estilistas
        case 'rendimiento_estilistas': {
            const days = getPeriodDays(args.periodo);
            const { rows } = await db.query(`
                SELECT
                    CONCAT(u.first_name, ' ', u.last_name) AS estilista,
                    COUNT(a.id) AS citas_completadas,
                    COALESCE(SUM(s.price), 0) AS ingresos_generados,
                    COALESCE(SUM(s.price * COALESCE(s.commission_percent, 0) / 100), 0) AS comision_estimada
                FROM appointments a
                JOIN users u ON a.stylist_id = u.id
                JOIN services s ON a.service_id = s.id
                WHERE a.tenant_id = $1::uuid
                  AND a.status IN ('completed', 'checked_out')
                  AND a.start_time >= NOW() - INTERVAL '1 day' * $2::int
                GROUP BY u.id, u.first_name, u.last_name
                ORDER BY ingresos_generados DESC
            `, [tenantId, days]);
            return { periodo: args.periodo || 'mes', estilistas: rows };
        }

        // 19. configurar_horario_salon
        case 'configurar_horario_salon': {
            try {
                if (!args.dias || !args.hora_inicio || !args.hora_fin) {
                    return { error: 'Faltan parámetros. Necesito: dias (ej: "lunes,martes,miercoles,jueves,viernes"), hora_inicio (ej: "8"), hora_fin (ej: "17").' };
                }

                // Mapeo español → inglés (el frontend usa claves en inglés)
                const esEnMap = { lunes: 'monday', martes: 'tuesday', miercoles: 'wednesday', jueves: 'thursday', viernes: 'friday', sabado: 'saturday', domingo: 'sunday' };
                const allDaysEs = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                const allDaysEn = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                const diasEs = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };

                // Parsear días del string (normalizar tildes)
                const diasInput = String(args.dias).toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .split(/[,\s]+/)
                    .map(d => d.trim())
                    .filter(Boolean);

                // Parsear horas
                const startH = String(parseInt(args.hora_inicio, 10)).padStart(2, '0');
                const endH = String(parseInt(args.hora_fin, 10)).padStart(2, '0');

                // Construir horario final con claves en inglés
                const finalHorario = {};
                for (let i = 0; i < allDaysEs.length; i++) {
                    const dayEs = allDaysEs[i];
                    const dayEn = allDaysEn[i];
                    if (diasInput.includes(dayEs)) {
                        finalHorario[dayEn] = `${startH}:00-${endH}:00`;
                    } else {
                        finalHorario[dayEn] = 'cerrado';
                    }
                }

                await db.query(
                    `UPDATE tenants SET working_hours = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`,
                    [JSON.stringify(finalHorario), tenantId]
                );

                const enEsMap = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
                const horarioLegible = allDaysEn.map(day =>
                    `${enEsMap[day] || day}: ${finalHorario[day] === 'cerrado' ? 'Cerrado' : finalHorario[day].replace('-', ' - ')}`
                ).join('\n');

                return {
                    success: true,
                    horario: finalHorario,
                    horario_legible: horarioLegible,
                    mensaje: 'Horario del salón actualizado correctamente.'
                };
            } catch (err) {
                return { error: `Error actualizando horario: ${err.message}` };
            }
        }

        // 20. actualizar_info_salon
        case 'actualizar_info_salon': {
            try {
                const updates = [];
                const values = [];
                let paramIdx = 1;

                if (args.nombre) { updates.push(`name = $${paramIdx++}`); values.push(args.nombre); }
                if (args.direccion) { updates.push(`address = $${paramIdx++}`); values.push(args.direccion); }
                if (args.ciudad) { updates.push(`city = $${paramIdx++}`); values.push(args.ciudad); }
                if (args.telefono) { updates.push(`phone = $${paramIdx++}`); values.push(args.telefono); }
                if (args.email) { updates.push(`email = $${paramIdx++}`); values.push(args.email); }
                if (args.sitio_web) { updates.push(`website = $${paramIdx++}`); values.push(args.sitio_web); }

                if (updates.length === 0) return { error: 'No se proporcionaron datos para actualizar.' };

                updates.push(`updated_at = NOW()`);
                values.push(tenantId);

                await db.query(
                    `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramIdx}::uuid`,
                    values
                );

                return {
                    success: true,
                    campos_actualizados: Object.keys(args).filter(k => args[k]),
                    mensaje: 'Información del salón actualizada correctamente.'
                };
            } catch (err) {
                return { error: `Error actualizando información: ${err.message}` };
            }
        }

        // 21. ver_configuracion_salon
        case 'ver_configuracion_salon': {
            const { rows } = await db.query(`
                SELECT name, address, city, phone, email, website, working_hours,
                       geofence_center_lat, geofence_center_lng, geofence_radius
                FROM tenants WHERE id = $1::uuid
            `, [tenantId]);
            if (!rows.length) return { error: 'No se encontró el salón.' };
            const t = rows[0];

            // Formatear horario legible (soporta claves en inglés o español)
            let horarioLegible = 'No configurado';
            if (t.working_hours) {
                const wh = typeof t.working_hours === 'string' ? JSON.parse(t.working_hours) : t.working_hours;
                const dayLabels = {
                    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
                    lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', miércoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', sábado: 'Sábado', domingo: 'Domingo'
                };
                horarioLegible = Object.entries(wh).map(([dia, h]) => {
                    const label = dayLabels[dia] || dia;
                    if (typeof h === 'string') return `${label}: ${h === 'cerrado' ? 'Cerrado' : h.replace('-', ' - ')}`;
                    if (h && h.start !== undefined) return `${label}: ${h.start}:00 - ${h.end}:00`;
                    return `${label}: Cerrado`;
                }).join('\n');
            }

            return {
                nombre: t.name,
                direccion: t.address || 'No configurada',
                ciudad: t.city || 'No configurada',
                telefono: t.phone || 'No configurado',
                email: t.email || 'No configurado',
                sitio_web: t.website || 'No configurado',
                horario: horarioLegible,
                geofence: t.geofence_center_lat ? {
                    lat: t.geofence_center_lat,
                    lng: t.geofence_center_lng,
                    radio_metros: t.geofence_radius
                } : 'No configurado'
            };
        }

        // 22. modificar_horario_estilista
        case 'modificar_horario_estilista': {
            try {
                if (!args.estilista) return { error: 'Debes indicar el nombre del estilista.' };
                if (!args.dias) return { error: 'Debes indicar los días. Ej: "lunes,martes".' };

                // Buscar estilista por nombre
                const stRows = await prisma.$queryRawUnsafe(`
                    SELECT id, first_name, last_name, working_hours FROM users
                    WHERE tenant_id = $1::uuid AND role_id = 3
                      AND COALESCE(NULLIF(status,''),'active') = 'active'
                      AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2
                           OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2)
                    LIMIT 1
                `, tenantId, `%${args.estilista.toLowerCase()}%`);

                if (!stRows.length) return { error: `No encontré un estilista llamado "${args.estilista}".` };
                const stylist = stRows[0];
                const stylistName = `${stylist.first_name} ${stylist.last_name || ''}`.trim();

                // Obtener horario actual
                let currentHours = stylist.working_hours || {};
                if (typeof currentHours === 'string') currentHours = JSON.parse(currentHours);

                const allDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                const diasEs = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
                const accion = args.accion || 'actualizar';

                // Parsear días del string
                const diasInput = String(args.dias).toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .split(/[,\s]+/)
                    .map(d => d.trim())
                    .filter(Boolean);

                let finalHorario;

                if (accion === 'quitar_dia') {
                    finalHorario = { ...currentHours };
                    for (const day of diasInput) {
                        delete finalHorario[day];
                    }
                } else if (accion === 'agregar_dia') {
                    if (!args.hora_inicio || !args.hora_fin) return { error: 'Para agregar días necesito hora_inicio y hora_fin.' };
                    finalHorario = { ...currentHours };
                    for (const day of diasInput) {
                        finalHorario[day] = { start: String(parseInt(args.hora_inicio, 10)), end: String(parseInt(args.hora_fin, 10)) };
                    }
                } else {
                    // Actualizar completo
                    if (!args.hora_inicio || !args.hora_fin) return { error: 'Para actualizar necesito hora_inicio y hora_fin.' };
                    finalHorario = {};
                    for (const day of allDays) {
                        if (diasInput.includes(day)) {
                            finalHorario[day] = { start: String(parseInt(args.hora_inicio, 10)), end: String(parseInt(args.hora_fin, 10)) };
                        }
                    }
                }

                // Guardar en DB
                await db.query(
                    `UPDATE users SET working_hours = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`,
                    [JSON.stringify(finalHorario), stylist.id]
                );

                const horarioLegible = allDays
                    .filter(day => finalHorario[day])
                    .map(day => {
                        const h = finalHorario[day];
                        return `${diasEs[day] || day}: ${h.start}:00 - ${h.end}:00`;
                    }).join('\n');

                return {
                    success: true,
                    estilista: stylistName,
                    horario: finalHorario,
                    horario_legible: horarioLegible || 'Sin horario definido (usa horario del salón)',
                    mensaje: `Horario de ${stylistName} actualizado correctamente.`
                };
            } catch (err) {
                return { error: `Error actualizando horario del estilista: ${err.message}` };
            }
        }

        // 23. ver_horario_estilista
        case 'ver_horario_estilista': {
            try {
                const stRows = await prisma.$queryRawUnsafe(`
                    SELECT id, first_name, last_name, working_hours FROM users
                    WHERE tenant_id = $1::uuid AND role_id = 3
                      AND COALESCE(NULLIF(status,''),'active') = 'active'
                      AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2
                           OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2)
                    LIMIT 1
                `, tenantId, `%${args.estilista.toLowerCase()}%`);

                if (!stRows.length) return { error: `No encontré un estilista llamado "${args.estilista}".` };
                const stylist = stRows[0];
                const stylistName = `${stylist.first_name} ${stylist.last_name || ''}`.trim();

                let workingHours = stylist.working_hours || {};
                if (typeof workingHours === 'string') workingHours = JSON.parse(workingHours);

                const allDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                const diasEs = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };

                const hasCustomHours = Object.keys(workingHours).length > 0;

                const horarioLegible = allDays.map(day => {
                    const h = workingHours[day];
                    if (!h) return `${diasEs[day] || day}: No trabaja`;
                    if (typeof h === 'string') return `${diasEs[day] || day}: ${h}`;
                    return `${diasEs[day] || day}: ${h.start}:00 - ${h.end}:00`;
                }).join('\n');

                return {
                    estilista: stylistName,
                    tiene_horario_personalizado: hasCustomHours,
                    horario: workingHours,
                    horario_legible: hasCustomHours ? horarioLegible : 'Usa el horario del salón (no tiene horario personalizado)',
                    nota: hasCustomHours ? '' : 'Este estilista no tiene horario personalizado. Trabaja según el horario general del salón.'
                };
            } catch (err) {
                return { error: `Error consultando horario: ${err.message}` };
            }
        }

        // 24. generar_nomina
        case 'generar_nomina': {
            try {
                const stRows = await prisma.$queryRawUnsafe(`
                    SELECT id, first_name, last_name, payment_type, base_salary, commission_rate
                    FROM users
                    WHERE tenant_id = $1::uuid AND role_id = 3
                      AND COALESCE(NULLIF(status,''),'active') = 'active'
                      AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2
                           OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2)
                    LIMIT 1
                `, tenantId, `%${args.estilista.toLowerCase()}%`);

                if (!stRows.length) {
                    return { error: `No encontré un estilista llamado "${args.estilista}".` };
                }

                const stylist = stRows[0];
                const stylistName = `${stylist.first_name} ${stylist.last_name || ''}`.trim();
                const startDate = new Date(args.fecha_inicio);
                const endDate = new Date(args.fecha_fin);
                endDate.setHours(23, 59, 59, 999);

                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return { error: 'Las fechas deben estar en formato YYYY-MM-DD.' };
                }

                const breakdown = await calculateStylistPayrollBreakdown(tenantId, stylist, startDate, endDate);

                // Save payroll record
                const totalCommissions = (breakdown.details?.services || []).reduce((s, srv) => s + (srv.net_commission || 0), 0)
                    + (breakdown.details?.products || []).reduce((s, p) => s + Number(p.commission_value || 0), 0);

                await prisma.payrolls.create({
                    data: {
                        tenant_id: tenantId,
                        stylist_id: stylist.id,
                        start_date: startDate,
                        end_date: endDate,
                        base_salary: stylist.payment_type === 'salary' ? Number(stylist.base_salary || 0) : 0,
                        commissions: totalCommissions,
                        total_paid: breakdown.net_paid || 0,
                        commission_rate_snapshot: Number(stylist.commission_rate || 0),
                    }
                });

                return {
                    exito: true,
                    estilista: stylistName,
                    periodo: `${args.fecha_inicio} a ${args.fecha_fin}`,
                    salario_base: stylist.payment_type === 'salary' ? Number(stylist.base_salary || 0) : 0,
                    comisiones_servicios: (breakdown.details?.services || []).reduce((s, srv) => s + (srv.net_commission || 0), 0),
                    comisiones_productos: (breakdown.details?.products || []).reduce((s, p) => s + Number(p.commission_value || 0), 0),
                    propinas: breakdown.stylist_tips || 0,
                    egresos_total: (breakdown.details?.expenses || []).reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0),
                    neto_a_pagar: breakdown.net_paid || 0,
                    servicios_realizados: (breakdown.details?.services || []).length,
                    mensaje: `Nómina de ${stylistName} generada y guardada. Período: ${args.fecha_inicio} a ${args.fecha_fin}. Neto a pagar: $${(breakdown.net_paid || 0).toLocaleString('es-CO')}`
                };
            } catch (err) {
                return { error: `Error generando nómina: ${err.message}` };
            }
        }

        // 25. ver_preview_nomina
        case 'ver_preview_nomina': {
            try {
                const startDate = new Date(args.fecha_inicio);
                const endDate = new Date(args.fecha_fin);
                endDate.setHours(23, 59, 59, 999);

                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return { error: 'Las fechas deben estar en formato YYYY-MM-DD.' };
                }

                let stylists;
                if (!args.estilista || args.estilista.toLowerCase() === 'todos') {
                    stylists = await prisma.$queryRawUnsafe(`
                        SELECT id, first_name, last_name, payment_type, base_salary, commission_rate
                        FROM users
                        WHERE tenant_id = $1::uuid AND role_id = 3
                          AND COALESCE(NULLIF(status,''),'active') = 'active'
                        ORDER BY first_name
                    `, tenantId);
                } else {
                    stylists = await prisma.$queryRawUnsafe(`
                        SELECT id, first_name, last_name, payment_type, base_salary, commission_rate
                        FROM users
                        WHERE tenant_id = $1::uuid AND role_id = 3
                          AND COALESCE(NULLIF(status,''),'active') = 'active'
                          AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2
                               OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2)
                    `, tenantId, `%${args.estilista.toLowerCase()}%`);
                }

                if (!stylists.length) {
                    return { error: `No encontré estilistas${args.estilista && args.estilista !== 'todos' ? ` con nombre "${args.estilista}"` : ''}.` };
                }

                const previews = [];
                for (const st of stylists) {
                    const breakdown = await calculateStylistPayrollBreakdown(tenantId, st, startDate, endDate);
                    previews.push({
                        estilista: `${st.first_name} ${st.last_name || ''}`.trim(),
                        servicios_realizados: (breakdown.details?.services || []).length,
                        comisiones: (breakdown.details?.services || []).reduce((s, srv) => s + (srv.net_commission || 0), 0)
                            + (breakdown.details?.products || []).reduce((s, p) => s + Number(p.commission_value || 0), 0),
                        propinas: breakdown.stylist_tips || 0,
                        egresos: (breakdown.details?.expenses || []).reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0),
                        neto_a_pagar: breakdown.net_paid || 0,
                    });
                }

                return {
                    periodo: `${args.fecha_inicio} a ${args.fecha_fin}`,
                    nota: 'Esta es una VISTA PREVIA. La nómina NO ha sido guardada. Para guardarla, usa "generar nómina".',
                    estilistas: previews,
                    total_general: previews.reduce((s, p) => s + p.neto_a_pagar, 0),
                };
            } catch (err) {
                return { error: `Error en preview de nómina: ${err.message}` };
            }
        }

        // 26. enviar_campana_inactivos
        case 'enviar_campana_inactivos': {
            try {
                const { getInactiveClients } = require('./campaignController');
                const { sendCampaignEmail } = require('../services/emailService');
                const { startCampaignQueue } = require('../services/campaignQueueService');

                const days = args.dias_inactividad || 30;
                const sendTest = args.enviar_prueba !== false; // default true
                const plantilla = args.plantilla || 'te_extranamos';

                const clients = await getInactiveClients(tenantId, days);
                if (clients.length === 0) {
                    return { mensaje: `No encontré clientes inactivos en los últimos ${days} días.` };
                }

                // Get admin info
                const admin = await prisma.users.findFirst({
                    where: { tenant_id: tenantId, role_id: { in: [1, 2] } },
                    select: { id: true, email: true, first_name: true },
                });

                // Template HTML
                const TEMPLATES = {
                    te_extranamos: {
                        subject: '¡Te extrañamos! Vuelve a visitarnos',
                        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#438eff;text-align:center;">Tupelukeria</h1><h2>¡Te extrañamos! 💇‍♀️</h2><p>Hola {{nombre}},</p><p>Hace tiempo que no te vemos por nuestro salón y queremos que sepas que <strong>te esperamos con los brazos abiertos</strong>.</p><p>Agenda tu próxima cita y déjanos consentirte.</p><p><strong>Tu equipo de Tupelukeria</strong></p></div>`,
                    },
                    descuento: {
                        subject: '¡Descuento especial solo para ti!',
                        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#438eff;text-align:center;">Tupelukeria</h1><div style="text-align:center;background:linear-gradient(135deg,#438eff,#6366f1);border-radius:12px;padding:30px;margin-bottom:20px;"><h2 style="color:white;">🎉 ¡Descuento Especial!</h2><p style="color:rgba(255,255,255,0.9);font-size:18px;">Obtén un <strong style="font-size:24px;">15% OFF</strong> en tu próximo servicio</p></div><p>Hola {{nombre}},</p><p>Porque valoramos tu lealtad, tenemos un descuento exclusivo esperándote.</p><p><strong>Tu equipo de Tupelukeria</strong></p></div>`,
                    },
                    nuevo_servicio: {
                        subject: '¡Conoce nuestro nuevo servicio!',
                        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#438eff;text-align:center;">Tupelukeria</h1><h2>✨ ¡Nuevo Servicio Disponible!</h2><p>Hola {{nombre}},</p><p>Estamos emocionados de anunciar que hemos incorporado un <strong>nuevo servicio</strong> a nuestro catálogo. Sé de los primeros en probarlo.</p><p><strong>Tu equipo de Tupelukeria</strong></p></div>`,
                    },
                };
                const tpl = TEMPLATES[plantilla] || TEMPLATES.te_extranamos;
                const subject = args.asunto || tpl.subject;

                if (sendTest) {
                    // Create campaign as draft + send test to admin
                    const campaign = await prisma.campaigns.create({
                        data: {
                            tenant_id: tenantId,
                            name: `Campaña inactivos (${days} días) - ${new Date().toLocaleDateString('es-CO')}`,
                            subject,
                            html_content: tpl.html,
                            target_criteria: { inactive_days: days },
                            total_recipients: clients.length,
                            created_by_user_id: admin?.id,
                        },
                    });

                    // Create recipients
                    if (clients.length > 0) {
                        await prisma.campaign_recipients.createMany({
                            data: clients.map(c => ({
                                campaign_id: campaign.id,
                                user_id: c.id,
                                email: c.email,
                                recipient_name: [c.first_name, c.last_name].filter(Boolean).join(' '),
                            })),
                        });
                    }

                    // Send test email to admin
                    if (admin?.email) {
                        await sendCampaignEmail({
                            to: admin.email,
                            subject: `[PRUEBA] ${subject}`,
                            html: tpl.html,
                            recipientName: admin.first_name || 'Admin',
                        });
                    }

                    return {
                        mensaje: `Encontré ${clients.length} clientes inactivos en los últimos ${days} días. Envié una prueba a ${admin?.email || 'tu email'}. La campaña quedó guardada como borrador. ¿Quiere que la envíe a todos?`,
                        clientes_inactivos: clients.length,
                        campaign_id: campaign.id,
                        prueba_enviada: true,
                    };
                } else {
                    // Find existing draft campaign or create and send
                    let campaign = await prisma.campaigns.findFirst({
                        where: { tenant_id: tenantId, status: 'draft' },
                        orderBy: { created_at: 'desc' },
                    });

                    if (!campaign) {
                        campaign = await prisma.campaigns.create({
                            data: {
                                tenant_id: tenantId,
                                name: `Campaña inactivos (${days} días) - ${new Date().toLocaleDateString('es-CO')}`,
                                subject,
                                html_content: tpl.html,
                                target_criteria: { inactive_days: days },
                                total_recipients: clients.length,
                                created_by_user_id: admin?.id,
                            },
                        });
                        if (clients.length > 0) {
                            await prisma.campaign_recipients.createMany({
                                data: clients.map(c => ({
                                    campaign_id: campaign.id,
                                    user_id: c.id,
                                    email: c.email,
                                    recipient_name: [c.first_name, c.last_name].filter(Boolean).join(' '),
                                })),
                            });
                        }
                    }

                    // Start sending
                    await prisma.campaigns.update({
                        where: { id: campaign.id },
                        data: { status: 'sending', updated_at: new Date() },
                    });
                    startCampaignQueue(campaign.id, null);

                    return {
                        mensaje: `¡Listo! Inicié el envío de la campaña a ${campaign.total_recipients} clientes inactivos. Puede ver el progreso en el panel de CRM → Campañas.`,
                        clientes: campaign.total_recipients,
                        campaign_id: campaign.id,
                        enviando: true,
                    };
                }
            } catch (err) {
                return { error: `Error en campaña de inactivos: ${err.message}` };
            }
        }

        default:
            return { error: `Función desconocida: ${fnName}` };
    }
}

// ==================== ENDPOINT PRINCIPAL ====================

// ==================== ONBOARDING ====================

async function checkTenantSetup(tenantId) {
    const [tenant, servicesCount, staffCount] = await Promise.all([
        prisma.tenants.findUnique({
            where: { id: tenantId },
            select: { name: true, working_hours: true },
        }),
        prisma.services.count({ where: { tenant_id: tenantId } }),
        prisma.users.count({ where: { tenant_id: tenantId, role_id: 3 } }),
    ]);

    if (!tenant) return { isComplete: true, steps: {} };

    const hours = typeof tenant.working_hours === 'string'
        ? JSON.parse(tenant.working_hours || '{}')
        : (tenant.working_hours || {});
    const hasHours = Object.values(hours).some(day => day && typeof day === 'object' && day.active === true);

    const steps = {
        name: Boolean((tenant.name || '').trim()),
        services: servicesCount > 0,
        staff: staffCount > 0,
        hours: hasHours,
    };

    const completed = Object.values(steps).filter(Boolean).length;
    const total = Object.keys(steps).length;

    return {
        isComplete: completed === total,
        steps,
        progress: Math.round((completed / total) * 100),
        servicesCount,
        staffCount,
    };
}

function buildOnboardingPrompt(setupStatus) {
    const { steps, servicesCount, staffCount } = setupStatus;

    let nextStep = '';
    if (!steps.services) {
        nextStep = `PASO ACTUAL: Crear al menos un servicio.
- Pregunta al jefe qué servicios ofrece (ej: Corte, Tinte, Alisado, etc.)
- Necesitas: nombre, precio y duración en minutos.
- Usa la función crear_servicio cuando tenga los datos.
- Ejemplo: "Jefe, ¿qué servicios ofreces? Dime el nombre, precio y cuánto dura cada uno."`;
    } else if (!steps.staff) {
        nextStep = `PASO ACTUAL: Agregar al menos un estilista.
- Ya tiene ${servicesCount} servicio(s) creado(s). ¡Celebra!
- Ahora necesita agregar estilistas. Necesitas: nombre, email, % comisión y tipo de pago.
- Usa la función crear_estilista cuando tenga los datos.
- Ejemplo: "Jefe, ¿quiénes trabajan contigo? Dime nombre, email y qué porcentaje de comisión les das."`;
    } else if (!steps.hours) {
        nextStep = `PASO ACTUAL: Configurar horario del salón.
- Ya tiene ${servicesCount} servicio(s) y ${staffCount} estilista(s). ¡Celebra!
- Ahora falta configurar el horario de atención.
- Pregunta qué días trabaja y en qué horario.
- Usa la función configurar_horario_salon con los datos.
- Ejemplo: "Jefe, ¿qué días abres y en qué horario? Por ejemplo: lunes a sábado de 8am a 6pm."`;
    }

    return `Eres el asistente de onboarding de TuPelukeria. Estás ayudando a un NUEVO dueño de salón a configurar su negocio por primera vez.

PERSONALIDAD:
- Siempre tratas al usuario como "jefe". Es tu forma natural de dirigirte a él.
- Eres entusiasta, motivador y paciente. Este es su primer contacto con la plataforma.
- Celebra cada paso completado con emojis y ánimo: "¡Excelente jefe! 🎉", "¡Ya casi! 💪"

ESTADO ACTUAL DEL SETUP:
- Nombre del salón: ${steps.name ? '✅' : '❌'}
- Servicios creados: ${steps.services ? `✅ (${servicesCount})` : '❌ (0)'}
- Estilistas registrados: ${steps.staff ? `✅ (${staffCount})` : '❌ (0)'}
- Horario configurado: ${steps.hours ? '✅' : '❌'}

${nextStep}

IMPORTAR DESDE EXCEL:
- Si el jefe pregunta por importar Excel, datos masivos o cargar archivos, dile: "Jefe, para importar un Excel usa el botón de clip/adjuntos (📎) que está al lado del campo de texto. Acepto cualquier formato y detecto automáticamente si son clientes, estilistas, servicios o productos."
- NO digas que no puedes importar Excel. El sistema SÍ lo soporta via el botón de adjuntos.

PLANES Y PRECIOS:
- Si el jefe pregunta por planes, precios o funciones:
  * Gratis ($0): Configurar salon, importar datos, calendario basico.
  * Pro ($29.900/mes): + Asistente IA de agendamiento (crear/ver citas), geolocalizacion, digiturno, nomina, inventario, crear recepcionistas.
  * Business ($49.900/mes): + Asistente IA completo (ventas, rendimiento, productos) + Bot WhatsApp con IA.
  * Enterprise ($99.900/mes): + Multiples sucursales + Estilistas compartidos entre sedes.
- El asistente de agendamiento (crear citas, ver agenda) se desbloquea en el plan Pro ($29.900/mes).
- El asistente completo (ventas, rendimiento, productos, nomina) se desbloquea en el plan Business ($49.900/mes).
- Enlace: "Ve a Configuración → Planes" o [Configuración → Planes](/settings).

REGLAS IMPORTANTES:
- Guía al jefe paso a paso. NO lo abrumes con todo a la vez.
- Si te saluda o es el primer mensaje, dale la bienvenida y muestra el progreso, luego guíalo al siguiente paso.
- Cuando el jefe dé los datos, EJECUTA la función inmediatamente. No pidas confirmación más de una vez.
- Si el jefe quiere saltar pasos o preguntar otra cosa, responde pero recuérdale amablemente qué falta por configurar.
- Cuando TODOS los pasos estén completados, celebra y dile: "¡Tu salón está listo! 🎊 Tu plan actual es GRATIS. Para el asistente de agendamiento necesitas el plan Pro ($29.900/mes). Para el asistente completo necesitas el plan Business ($49.900/mes). Ve a Configuración → Planes."

EJECUCIÓN DE FUNCIONES:
- Cuando el jefe confirme un cambio (dice "sí", "dale", "hazlo"), EJECUTA la función INMEDIATAMENTE.
- SIEMPRE llena TODOS los parámetros requeridos.

CREACIÓN DE ESTILISTAS - DATOS REQUERIDOS:
1. Nombre completo
2. Email
3. Porcentaje de comisión (ej: 40%, 50%)
4. Tipo de pago: 'commission', 'salary', o 'mixed'
Si falta alguno, pregunta antes de crear.`;
}

exports.chat = async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;
        const tenantId = req.user.tenant_id;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
        }

        // Check tenant setup status for onboarding
        const setupStatus = await checkTenantSetup(tenantId);

        // Plan check: restrict AI by plan level
        const tenantPlan = await getTenantPlan(tenantId);

        // Free plan + setup complete → block entirely
        if (tenantPlan === 'free' && setupStatus.isComplete) {
            return res.json({
                response: `Jefe, en el plan **Gratis** solo puedo ayudarte a configurar tu salon (servicios, estilistas, horarios e importar datos).

Para que te ayude con **agendamiento** (crear citas, ver agenda, consultar horarios), necesitas el plan **Pro** ($29.900/mes).

Para el **asistente completo** (ventas, rendimiento, productos, nomina y mas), necesitas el plan **Business** ($49.900/mes).

👉 Ve a [Configuracion → Planes](/settings) para subir de plan.`,
                functionExecuted: null,
            });
        }

        const apiKey = await getGlobalOpenAIKey();
        if (!apiKey) {
            return res.status(500).json({ error: 'No hay API key de OpenAI configurada.' });
        }

        // Pro plan: only scheduling tools. Business+: all tools.
        const SCHEDULING_TOOL_NAMES = [
            'ver_citas_hoy', 'ver_agenda_fecha', 'crear_cita',
            'listar_servicios', 'listar_estilistas', 'ver_horario_estilista',
        ];
        const isProOnly = tenantPlan === 'pro' && setupStatus.isComplete;
        const toolsForPlan = isProOnly
            ? ADMIN_TOOLS.filter(t => SCHEDULING_TOOL_NAMES.includes(t.function.name))
            : ADMIN_TOOLS;

        const proSystemNote = isProOnly
            ? `\n\nIMPORTANTE: Este salon tiene plan Pro. SOLO puedes ayudar con agendamiento: ver citas, crear citas, consultar servicios, estilistas y horarios. Si el jefe pregunta por ventas, productos, rendimiento, nomina u otra funcion avanzada, responde amablemente que esas funciones estan disponibles desde el plan Business ($49.900/mes) y sugiere ir a Configuracion → Planes.`
            : '';

        // Construir mensajes
        const now = formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd hh:mm a');
        const systemPrompt = setupStatus.isComplete
            ? `${ADMIN_SYSTEM_PROMPT}${proSystemNote}\n\nFecha/hora actual: ${now}`
            : `${buildOnboardingPrompt(setupStatus)}\n\nFecha/hora actual: ${now}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...(conversationHistory || []).slice(-10),
            { role: 'user', content: message.trim() }
        ];

        // Primera llamada a OpenAI
        const firstResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                tools: toolsForPlan,
                tool_choice: 'auto',
                temperature: 0.5,
                max_tokens: 800
            })
        });

        if (!firstResponse.ok) {
            const errBody = await firstResponse.text();
            console.error('[AI Admin] OpenAI error:', errBody);
            return res.status(502).json({ error: 'Error al comunicarse con OpenAI.' });
        }

        const firstData = await firstResponse.json();
        const assistantMessage = firstData.choices[0].message;

        // Track tokens
        if (firstData.usage) {
            trackUsage(tenantId, 'admin_chat', firstData.model || 'gpt-4o-mini',
                firstData.usage.prompt_tokens, firstData.usage.completion_tokens).catch(() => {});
        }

        // Si no hay tool_calls, devolver respuesta directa
        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
            return res.json({
                response: assistantMessage.content || 'No tengo respuesta en este momento.',
                functionExecuted: null,
                setupStatus: setupStatus.isComplete ? undefined : setupStatus
            });
        }

        // Ejecutar TODAS las tool_calls en paralelo (mejora vs cliente que solo procesa [0])
        const toolResults = await Promise.all(
            assistantMessage.tool_calls.map(async (toolCall) => {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                let result;
                try {
                    result = await executeFunction(functionName, functionArgs, tenantId);
                } catch (err) {
                    console.error(`[AI Admin] Error en ${functionName}:`, err.message);
                    result = { error: `Error ejecutando ${functionName}: ${err.message}` };
                }
                return {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                };
            })
        );

        // Segunda llamada con resultados de las funciones
        const followUpMessages = [
            ...messages,
            assistantMessage,
            ...toolResults
        ];

        const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: followUpMessages,
                temperature: 0.5,
                max_tokens: 800
            })
        });

        if (!secondResponse.ok) {
            const errBody = await secondResponse.text();
            console.error('[AI Admin] OpenAI follow-up error:', errBody);
            return res.status(502).json({ error: 'Error al procesar la respuesta de las funciones.' });
        }

        const secondData = await secondResponse.json();

        if (secondData.usage) {
            trackUsage(tenantId, 'admin_chat', secondData.model || 'gpt-4o-mini',
                secondData.usage.prompt_tokens, secondData.usage.completion_tokens).catch(() => {});
        }

        const finalContent = secondData.choices[0].message.content || 'No pude generar una respuesta.';
        const executedFunctions = assistantMessage.tool_calls.map(tc => tc.function.name).join(', ');

        // Re-check setup status after function execution (might have changed)
        const updatedSetupStatus = await checkTenantSetup(tenantId);

        return res.json({
            response: finalContent,
            functionExecuted: executedFunctions,
            setupStatus: updatedSetupStatus.isComplete ? undefined : updatedSetupStatus
        });

    } catch (err) {
        console.error('[AI Admin Chat] Error:', err);
        return res.status(500).json({ error: 'Error interno del asistente admin.' });
    }
};

// ==================== HEALTH CHECK ====================

exports.health = async (req, res) => {
    try {
        const apiKey = await getGlobalOpenAIKey();
        res.json({ status: 'ok', endpoint: 'ai-admin-chat', hasApiKey: !!apiKey });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
};

// ==================== EXPORTS PARA WHATSAPP ADMIN ====================
exports.executeFunction = executeFunction;
exports.ADMIN_TOOLS = ADMIN_TOOLS;
exports.ADMIN_SYSTEM_PROMPT = ADMIN_SYSTEM_PROMPT;
