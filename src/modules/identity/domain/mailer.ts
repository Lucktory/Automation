/**
 * Puerto de correo transaccional.
 *
 * El dominio no sabe si detrás hay Resend, SMTP o la consola. Eso es lo que
 * permite que el flujo de recuperación de contraseña esté COMPLETO sin tener
 * todavía una clave de Resend: cambia el adaptador, no el flujo.
 */

export interface Mail {
  to: string;
  subject: string;
  /** Texto plano. El HTML llega cuando haya plantillas de marca. */
  body: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/**
 * Construye el correo de recuperación.
 *
 * Vive en el dominio a propósito: el texto que recibe un cliente es una
 * decisión de producto, no del proveedor de envío.
 */
export function passwordResetMail(options: {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
  locale: string;
}): Mail {
  const isSpanish = options.locale.startsWith("es");

  return {
    to: options.to,
    subject: isSpanish
      ? "Restablece tu contraseña · Automoción OS"
      : "Reset your password · Automoción OS",
    body: isSpanish
      ? [
          "Recibimos una solicitud para restablecer tu contraseña.",
          "",
          `Abre este enlace: ${options.resetUrl}`,
          "",
          `El enlace caduca en ${options.expiresInMinutes} minutos.`,
          "Si no fuiste tú, puedes ignorar este mensaje: tu contraseña no cambia.",
        ].join("\n")
      : [
          "We received a request to reset your password.",
          "",
          `Open this link: ${options.resetUrl}`,
          "",
          `The link expires in ${options.expiresInMinutes} minutes.`,
          "If this wasn't you, ignore this message — your password stays the same.",
        ].join("\n"),
  };
}
