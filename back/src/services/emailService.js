// src/services/emailService.js
const { Resend } = require('resend');

// Lazy init: don't crash on import if API key is missing
let _resend;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@tupelukeria.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.tupelukeria.com';

/**
 * Generic email sender via Resend.
 */
async function sendEmail({ to, subject, html }) {
  const { data, error } = await getResend().emails.send({
    from: `Tupelukeria <${FROM_EMAIL}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error('[emailService] Resend error:', error);
    throw new Error(error.message || 'Error enviando email');
  }

  return data;
}

/**
 * Send password reset email.
 */
async function sendPasswordResetEmail(email, token, firstName) {
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #438eff 0%, #6c5ce7 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Tupelukeria</h1>
      </div>
      <div style="padding: 30px;">
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="width: 64px; height: 64px; background: #fff3e0; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">🔐</span>
          </div>
        </div>
        <h2 style="color: #333; text-align: center;">Recuperar Contraseña</h2>
        <p style="color: #666;">Hola${firstName ? ` <strong>${firstName}</strong>` : ''},</p>
        <p style="color: #666;">Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #438eff; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center;">Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
        <div style="background: #fff8e1; border-radius: 6px; padding: 12px 15px; margin-top: 20px; font-size: 13px; color: #795548;">
          <strong>Consejo de seguridad:</strong> Nunca compartas este enlace con nadie. Tupelukeria nunca te pedirá tu contraseña por correo.
        </div>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; padding: 20px;">
        &copy; ${new Date().getFullYear()} Tupelukeria. Todos los derechos reservados.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Recuperar tu contraseña - Tupelukeria',
    html,
  });
}

/**
 * Send subscription confirmation email after Stripe payment.
 */
async function sendSubscriptionEmail(email, tenantName, plan, periodEnd) {
  const planNames = { test: 'Test', pro: 'Pro', business: 'Business', enterprise: 'Enterprise' };
  const planPrices = { test: '$2.000 COP', pro: '$29.900 COP', business: '$49.900 COP', enterprise: '$129.900 COP' };
  const displayPlan = planNames[plan] || plan;
  const displayPrice = planPrices[plan] || '';
  const nextDate = periodEnd ? new Date(periodEnd).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #438eff 0%, #6c5ce7 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Tupelukeria</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">Tu suscripción está activa</p>
      </div>
      <div style="padding: 30px;">
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="width: 64px; height: 64px; background: #e8f5e9; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">✓</span>
          </div>
        </div>
        <h2 style="color: #333; text-align: center; margin-bottom: 5px;">¡Gracias por tu suscripción!</h2>
        <p style="color: #666; text-align: center;">Hola <strong>${tenantName || ''}</strong>, tu pago ha sido procesado exitosamente.</p>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #438eff;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Plan</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${displayPlan}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Precio mensual</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${displayPrice}</td></tr>
            ${nextDate ? `<tr><td style="padding: 8px 0; color: #666;">Próxima renovación</td><td style="padding: 8px 0; text-align: right; color: #333;">${nextDate}</td></tr>` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/settings?tab=6"
             style="background-color: #438eff; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Ver mi suscripción
          </a>
        </div>

        <p style="color: #888; font-size: 13px; text-align: center;">
          Puedes administrar tu suscripción, cambiar de plan o ver tus facturas desde la configuración de tu cuenta.
        </p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; padding: 20px;">
        &copy; ${new Date().getFullYear()} Tupelukeria. Todos los derechos reservados.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `¡Bienvenido al plan ${displayPlan}! - Tupelukeria`,
    html,
  });
}

/**
 * Send electronic invoice email to client after POS purchase.
 */
async function sendInvoiceEmail({ to, clientName, invoiceId, items, totalAmount, tenantName, paymentMethod }) {
  const itemRows = (items || []).map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.total_price || 0).toLocaleString('es-CO')}</td>
    </tr>
  `).join('');

  const shortId = String(invoiceId).slice(0, 8).toUpperCase();
  const payMethodLabel = paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'credit_card' ? 'Tarjeta' : (paymentMethod || 'Mixto');

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #438eff 0%, #6c5ce7 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${tenantName || 'Tu Peluquería'}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px;">Comprobante de compra</p>
      </div>
      <div style="padding: 30px;">
        <p style="color: #666;">Hola <strong>${clientName || 'Cliente'}</strong>,</p>
        <p style="color: #666;">Aquí tienes el detalle de tu compra:</p>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 5px 0; color: #888;">Factura</td><td style="text-align: right; font-weight: bold;">#${shortId}</td></tr>
            <tr><td style="padding: 5px 0; color: #888;">Fecha</td><td style="text-align: right;">${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
            <tr><td style="padding: 5px 0; color: #888;">Método de pago</td><td style="text-align: right;">${payMethodLabel}</td></tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 20px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left;">Descripción</th>
              <th style="padding: 10px; text-align: center;">Cant.</th>
              <th style="padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 10px; font-weight: bold; font-size: 16px;">TOTAL</td>
              <td style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 16px; color: #438eff;">$${Number(totalAmount || 0).toLocaleString('es-CO')}</td>
            </tr>
          </tfoot>
        </table>

        <p style="color: #888; font-size: 13px; text-align: center;">¡Gracias por tu preferencia! Te esperamos pronto.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; padding: 20px;">
        &copy; ${new Date().getFullYear()} ${tenantName || 'Tupelukeria'}. Todos los derechos reservados.<br/>
        Powered by <a href="https://tupelukeria.com" style="color: #438eff;">Tupelukeria</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Comprobante de compra #${shortId} - ${tenantName || 'Tu Peluquería'}`,
    html,
  });
}

/**
 * Send welcome email to new stylist with login credentials.
 */
async function sendStylistWelcomeEmail({ to, stylistName, tenantName, email, password }) {
  const appUrl = `${FRONTEND_URL}/login`;
  const stylistAppUrl = 'https://app.tupelukeria.com/stylist-app';

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #438eff 0%, #6c5ce7 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Tupelukeria</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">¡Bienvenido/a al equipo!</p>
      </div>
      <div style="padding: 30px;">
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="width: 64px; height: 64px; background: #e0e7ff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">💇</span>
          </div>
        </div>
        <h2 style="color: #333; text-align: center; margin-bottom: 5px;">¡Hola ${stylistName || ''}!</h2>
        <p style="color: #666; text-align: center;">Has sido agregado/a como estilista en <strong>${tenantName || 'tu salón'}</strong>.</p>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #438eff;">
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #333;">Tus datos de acceso:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #333; font-family: monospace;">${email}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Contraseña</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #333; font-family: monospace;">${password}</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}"
             style="background-color: #438eff; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Iniciar Sesión
          </a>
        </div>

        <div style="background: #fff8e1; border-radius: 6px; padding: 12px 15px; margin-top: 20px; font-size: 13px; color: #795548;">
          <strong>Importante:</strong> Te recomendamos cambiar tu contraseña después de tu primer inicio de sesión.
        </div>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; padding: 20px;">
        &copy; ${new Date().getFullYear()} Tupelukeria. Todos los derechos reservados.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `¡Bienvenido/a a ${tenantName || 'Tupelukeria'}! - Tus datos de acceso`,
    html,
  });
}

/**
 * Send a campaign email. Replaces {{nombre}} with the recipient's name.
 */
async function sendCampaignEmail({ to, subject, html, recipientName }) {
  const personalizedHtml = html.replace(/\{\{nombre\}\}/gi, recipientName || '');
  return sendEmail({ to, subject, html: personalizedHtml });
}

/**
 * Email privado al estilista con el estado de su arriendo (coworking).
 * Se usa cuando el bot quiere darle info sensible sin exponerla en WhatsApp.
 */
async function sendRenterStatusEmail({ to, firstName, tenantName, monthlyCop, dailyCop, status, daysOverdue, graceDays, nextStep, portalUrl }) {
  const fmt = (v) => Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const statusLabel = {
    active: { text: 'Al día', color: '#16a34a' },
    past_due: { text: 'Pago pendiente', color: '#f59e0b' },
    blocked: { text: 'Bloqueado', color: '#dc2626' },
  }[status] || { text: 'Sin activar', color: '#6b7280' };

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #438eff 0%, #6c5ce7 100%); padding: 32px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Tu Coworking en ${tenantName || 'tu salón'}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 14px;">Estado de tu arriendo</p>
      </div>
      <div style="padding: 30px;">
        <p style="color: #666;">Hola${firstName ? ` <strong>${firstName}</strong>` : ''},</p>
        <p style="color: #666;">Aquí tienes el estado actual de tu Coworking. <strong>No compartimos esto por WhatsApp por privacidad.</strong></p>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid ${statusLabel.color};">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #666;">Estado</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${statusLabel.color};">${statusLabel.text}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Mensualidad</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${fmt(monthlyCop)}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Cobro diario</td><td style="padding: 8px 0; text-align: right; color: #333;">${fmt(dailyCop)}</td></tr>
            ${daysOverdue != null ? `<tr><td style="padding: 8px 0; color: #666;">Días en mora</td><td style="padding: 8px 0; text-align: right; color: #dc2626; font-weight: bold;">${daysOverdue}</td></tr>` : ''}
            ${graceDays != null ? `<tr><td style="padding: 8px 0; color: #666;">Días de gracia</td><td style="padding: 8px 0; text-align: right; color: #333;">${graceDays}</td></tr>` : ''}
          </table>
        </div>

        ${nextStep ? `
          <div style="background: #fff8e1; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #5b3a00;">
            <strong>Siguiente paso:</strong> ${nextStep}
          </div>
        ` : ''}

        ${portalUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" style="background-color: #438eff; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Abrir mi portal de pago
            </a>
          </div>
        ` : ''}

        <p style="color: #888; font-size: 13px;">Este correo es solo para ti. No compartas el link de tu portal con nadie — desde ahí se administra tu tarjeta de pago.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; padding: 20px;">
        &copy; ${new Date().getFullYear()} Tupelukeria
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Tu Coworking en ${tenantName || 'tu salón'} — estado actual`,
    html,
  });
}

/**
 * Invitación de acceso para un estilista de Coworking.
 * Reutiliza el flujo de reset-password (mismo /reset-password/:token) pero con
 * copy de activación de cuenta.
 */
async function sendCoworkingInviteEmail({ email, token, firstName, tenantName }) {
  const activateUrl = `${FRONTEND_URL}/reset-password/${token}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #438eff 0%, #6c5ce7 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Tupelukeria</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">Tu espacio de Coworking</p>
      </div>
      <div style="padding: 30px;">
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="width: 64px; height: 64px; background: #e8f0ff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">💈</span>
          </div>
        </div>
        <h2 style="color: #333; text-align: center;">Activa tu cuenta</h2>
        <p style="color: #666;">Hola${firstName ? ` <strong>${firstName}</strong>` : ''},</p>
        <p style="color: #666;">${tenantName || 'Tu salón'} te dio acceso a tu espacio de <strong>Coworking</strong> en Tupelukeria. Allí podrás ver el estado de tu Coworking, tus pagos, tu agenda y actualizar tu método de pago.</p>
        <p style="color: #666;">Crea tu contraseña para ingresar. Tu usuario es este mismo correo (<strong>${email}</strong>).</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activateUrl}"
             style="background-color: #438eff; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Crear mi contraseña
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center;">Este enlace expira en 72 horas. Si no esperabas este correo, puedes ignorarlo.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 0;" />
      <p style="color: #999; font-size: 12px; text-align: center; padding: 20px;">
        &copy; ${new Date().getFullYear()} Tupelukeria. Todos los derechos reservados.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Activa tu cuenta de Coworking en ${tenantName || 'Tupelukeria'}`,
    html,
  });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendSubscriptionEmail,
  sendInvoiceEmail,
  sendStylistWelcomeEmail,
  sendCampaignEmail,
  sendRenterStatusEmail,
  sendCoworkingInviteEmail,
};
