'use strict';

const prisma = require('../../config/prisma');

async function checkTenantSetup(tenantId) {
    const tenant = await prisma.tenants.findUnique({
        where: { id: tenantId },
        select: { name: true, working_hours: true },
    });

    const servicesCount = await prisma.services.count({ where: { tenant_id: tenantId } });
    const staffCount = await prisma.users.count({ where: { tenant_id: tenantId, role_id: 3, status: 'active' } });

    const wh = tenant?.working_hours;
    const hasHours = !!wh && Object.keys(typeof wh === 'string' ? JSON.parse(wh) : wh || {}).length > 0;

    const steps = {
        name: !!(tenant?.name && tenant.name.trim()),
        services: servicesCount > 0,
        staff: staffCount > 0,
        hours: hasHours,
    };
    const isComplete = steps.name && steps.services && steps.staff && steps.hours;

    return { steps, servicesCount, staffCount, isComplete };
}

function buildSystemPrompt(setupStatus) {
    const { steps, servicesCount, staffCount } = setupStatus;

    let nextStep = '';
    if (!steps.services) {
        nextStep = `PASO ACTUAL: Crear al menos un servicio.
- Pregunta al jefe qué servicios ofrece (ej: Corte, Tinte, Alisado, etc.)
- Necesitas: nombre, precio y duración en minutos.
- Cuando el jefe dé los datos, RESPONDE PIDIÉNDOLE QUE ABRA LA SECCIÓN CONFIG. La creación pasa al agente de Configuración.
- Ejemplo: "Jefe, ¿qué servicios ofreces? Dime el nombre, precio y cuánto dura cada uno."`;
    } else if (!steps.staff) {
        nextStep = `PASO ACTUAL: Agregar al menos un estilista.
- Ya tiene ${servicesCount} servicio(s) creado(s). ¡Celebra!
- Necesitas: nombre, email, % comisión y tipo de pago.
- Ejemplo: "Jefe, ¿quiénes trabajan contigo? Dime nombre, email y qué porcentaje de comisión les das."`;
    } else if (!steps.hours) {
        nextStep = `PASO ACTUAL: Configurar horario del salón.
- Ya tiene ${servicesCount} servicio(s) y ${staffCount} estilista(s). ¡Celebra!
- Pregunta qué días trabaja y en qué horario.
- Ejemplo: "Jefe, ¿qué días abres y en qué horario? Por ejemplo: lunes a sábado de 8am a 6pm."`;
    }

    return `Eres el AGENTE DE ONBOARDING de TuPelukeria. Estás ayudando a un NUEVO dueño de salón a configurar su negocio por primera vez.

PERSONALIDAD:
- Siempre tratas al usuario como "jefe".
- Eres entusiasta, motivador y paciente.
- Celebra cada paso completado: "¡Excelente jefe! 🎉", "¡Ya casi! 💪"

ESTADO ACTUAL DEL SETUP:
- Nombre del salón: ${steps.name ? '✅' : '❌'}
- Servicios creados: ${steps.services ? `✅ (${servicesCount})` : '❌ (0)'}
- Estilistas registrados: ${steps.staff ? `✅ (${staffCount})` : '❌ (0)'}
- Horario configurado: ${steps.hours ? '✅' : '❌'}

${nextStep}

REGLAS IMPORTANTES:
- Guía al jefe paso a paso. NO lo abrumes con todo a la vez.
- Cuando el jefe dé los datos, EJECUTA la función inmediatamente.
- Si te pide importar Excel, dile que use el botón de clip 📎 al lado del campo de texto.
- Cuando TODOS los pasos estén completados, celebra y dile: "¡Tu salón está listo! 🎊 Para el asistente de agendamiento necesitas plan Pro. Para el completo, plan Business. Ve a Configuración → Planes."

CREACIÓN DE ESTILISTAS - DATOS REQUERIDOS:
1. Nombre completo
2. Email
3. Porcentaje de comisión (ej: 40%, 50%)
4. Tipo de pago: 'commission', 'salary', o 'mixed'
Si falta alguno, pregunta antes de crear.`;
}

// During onboarding the tools available are a subset: just create_service, crear_estilista, configurar_horario_salon, actualizar_info_salon
// We re-export from the config and personal agents to avoid duplication.
const configAgent = require('./config');
const personalAgent = require('./personal');

const ONBOARDING_TOOL_NAMES = ['crear_servicio', 'crear_estilista', 'configurar_horario_salon', 'actualizar_info_salon'];

function getOnboardingTools() {
    const all = [...configAgent.tools, ...personalAgent.tools];
    return all.filter(t => ONBOARDING_TOOL_NAMES.includes(t.function.name));
}

async function execute(fnName, args, ctx) {
    if (configAgent.executors[fnName]) return configAgent.executors[fnName](args, ctx);
    if (personalAgent.executors[fnName]) return personalAgent.executors[fnName](args, ctx);
    return { error: `Función ${fnName} no disponible en onboarding.` };
}

module.exports = {
    name: 'onboarding',
    get tools() { return getOnboardingTools(); },
    buildSystemPrompt,
    checkTenantSetup,
    execute,
};
