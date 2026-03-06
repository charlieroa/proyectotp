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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #438eff; margin: 0;">Tupelukeria</h1>
      </div>
      <h2 style="color: #333;">Recuperar Contraseña</h2>
      <p>Hola${firstName ? ` ${firstName}` : ''},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}"
           style="background-color: #438eff; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Restablecer Contraseña
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">
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
 * Send a campaign email. Replaces {{nombre}} with the recipient's name.
 */
async function sendCampaignEmail({ to, subject, html, recipientName }) {
  const personalizedHtml = html.replace(/\{\{nombre\}\}/gi, recipientName || '');
  return sendEmail({ to, subject, html: personalizedHtml });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendCampaignEmail,
};
