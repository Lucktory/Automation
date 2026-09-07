import { env } from "@/config/env";
import type { Mail, Mailer } from "../domain/mailer";

/**
 * Adaptadores de correo.
 *
 * `ConsoleMailer` no es un stub: es el adaptador de desarrollo. El flujo de
 * recuperación está completo —token, caducidad, enlace, página de
 * restablecimiento—; lo único que cambia al aparecer la clave de Resend es cuál
 * de estas dos clases inyecta el composition root.
 */

export class ConsoleMailer implements Mailer {
  async send(mail: Mail): Promise<void> {
    console.info(
      [
        "",
        "──────────── CORREO (adaptador de desarrollo) ────────────",
        `Para:    ${mail.to}`,
        `Asunto:  ${mail.subject}`,
        "",
        mail.body,
        "──────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  }
}

export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(mail: Mail): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: mail.to,
        subject: mail.subject,
        text: mail.body,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);
    }
  }
}

/** Resend si hay clave; si no, la consola. Sin ramas repartidas por el código. */
export function createMailer(): Mailer {
  return env.RESEND_API_KEY === undefined
    ? new ConsoleMailer()
    : new ResendMailer(env.RESEND_API_KEY, "Automoción OS <no-reply@automocion.os>");
}
