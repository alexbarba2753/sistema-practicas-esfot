import sgMail from '@sendgrid/mail';
import { ENV } from '../config/env.js';

if (ENV.SENDGRID_API_KEY) {
  sgMail.setApiKey(ENV.SENDGRID_API_KEY);
}

export const emailAdapter = {

  async enviarTokenVerificacion(correo, nombres, token) {
    const asunto = 'Verificación de Cuenta - Sistema de Prácticas ESFOT';
    const mensajeTexto = `Hola ${nombres},\n\nGracias por registrarte en el Sistema de Gestión de Prácticas Laborales y Comunitarias de la ESFOT - EPN.\n\nTu token de activación es:\n${token}\n\nIngresa este token en el sistema para activar tu cuenta e iniciar sesión.\n\nSaludos,\nComisión de Prácticas ESFOT`;

    const mensajeHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #003366; text-align: center;">ESFOT - Escuela Politécnica Nacional</h2>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;" />
        <p>Estimado(a) <strong>${nombres}</strong>,</p>
        <p>Tu cuenta ha sido creada exitosamente. Para activarla y poder acceder al sistema, utiliza el siguiente token de verificación:</p>
        <div style="background-color: #f4f6f9; border-left: 4px solid #003366; padding: 12px; margin: 20px 0; font-size: 18px; font-weight: bold; letter-spacing: 2px; text-align: center;">
          ${token}
        </div>
        <p style="font-size: 13px; color: #777;">Si no has solicitado este registro, por favor ignora este correo.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Sistema de Gestión de Prácticas Preprofesionales - ESFOT EPN</p>
      </div>
    `;

    try {
      if (ENV.SENDGRID_API_KEY && ENV.SENDGRID_API_KEY !== 'dummy_or_real_key_here') {
        await sgMail.send({
          to: correo,
          from: ENV.EMAIL_FROM,
          subject: asunto,
          text: mensajeTexto,
          html: mensajeHtml
        });
        console.log(`[SendGrid] Correo de verificación enviado con éxito a: ${correo}`);
      } else {
        console.log(`[SendGrid Simulation] Token de verificación para ${correo}: ${token}`);
      }
      return true;
    } catch (error) {
      console.error('[SendGrid] Error al enviar correo de verificación:', error.response?.body || error.message);
      console.log(`[SendGrid Fallback] Token para pruebas locales de ${correo}: ${token}`);
      return false;
    }
  },


  async enviarTokenRecuperacion(correo, nombres, token) {
    const asunto = 'Recuperación de Contraseña - Sistema de Prácticas ESFOT';
    const mensajeTexto = `Hola ${nombres},\n\nHas solicitado restablecer tu contraseña en el Sistema de Prácticas ESFOT.\n\nTu token temporal de recuperación es:\n${token}\n\nEste token tiene una validez de 1 hora. Si no realizaste esta solicitud, ignora este mensaje.\n\nSaludos,\nComisión de Prácticas ESFOT`;

    const mensajeHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #003366; text-align: center;">ESFOT - Escuela Politécnica Nacional</h2>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;" />
        <p>Estimado(a) <strong>${nombres}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Tu token temporal de recuperación es:</p>
        <div style="background-color: #fdf2e9; border-left: 4px solid #d35400; padding: 12px; margin: 20px 0; font-size: 18px; font-weight: bold; letter-spacing: 2px; text-align: center; color: #d35400;">
          ${token}
        </div>
        <p style="font-size: 13px; color: #777;">Este token expirará en 1 hora por razones de seguridad.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Sistema de Gestión de Prácticas Preprofesionales - ESFOT EPN</p>
      </div>
    `;

    try {
      if (ENV.SENDGRID_API_KEY && ENV.SENDGRID_API_KEY !== 'dummy_or_real_key_here') {
        await sgMail.send({
          to: correo,
          from: ENV.EMAIL_FROM,
          subject: asunto,
          text: mensajeTexto,
          html: mensajeHtml
        });
        console.log(`[SendGrid] Correo de recuperación enviado con éxito a: ${correo}`);
      } else {
        console.log(`[SendGrid Simulation] Token de recuperación para ${correo}: ${token}`);
      }
      return true;
    } catch (error) {
      console.error('[SendGrid] Error al enviar correo de recuperación:', error.response?.body || error.message);
      console.log(`[SendGrid Fallback] Token para pruebas locales de ${correo}: ${token}`);
      return false;
    }
  }
};
