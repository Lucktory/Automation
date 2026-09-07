import type { QuoteSnapshot } from "./snapshot";

/**
 * El correo que acompaña una propuesta.
 *
 * Vive en el dominio, no en el adaptador de envío, por la misma razón que el
 * correo de recuperación de contraseña: lo que lee un cliente es una decisión
 * de producto. Cambiar de Resend a SMTP no debería reescribir este texto.
 *
 * No adjunta el PDF: manda el ENLACE. Un adjunto queda congelado en la bandeja
 * de entrada, mientras que el enlace sirve la propuesta desde su instantánea —
 * la misma cifra, pero con el estado real de la cotización detrás.
 */
export interface QuoteMailOptions {
  to: string;
  reference: string;
  snapshot: QuoteSnapshot;
  pdfUrl: string;
  locale: string;
  formatTotal: (minor: string) => string;
}

export function quoteProposalMail(options: QuoteMailOptions): {
  to: string;
  subject: string;
  body: string;
} {
  const isEs = options.locale === "es";
  const vehicle = options.snapshot.vehicle.description;
  const total = options.formatTotal(options.snapshot.result.totalCop.minor);

  const subject = isEs
    ? `Propuesta ${options.reference} · ${vehicle}`
    : `Proposal ${options.reference} · ${vehicle}`;

  const body = isEs
    ? [
        `Hola,`,
        ``,
        `Adjuntamos la propuesta ${options.reference} para el ${vehicle}.`,
        ``,
        `Costo puesto en Colombia, con placas: ${total}`,
        ``,
        `Puedes descargar el documento completo aquí:`,
        options.pdfUrl,
        ``,
        `El desglose incluye arancel, IVA e impoconsumo calculados cada uno sobre su`,
        `propia base, con la norma citada línea por línea.`,
        ``,
        `Automoción OS`,
      ].join("\n")
    : [
        `Hello,`,
        ``,
        `Here is proposal ${options.reference} for the ${vehicle}.`,
        ``,
        `Landed cost in Colombia, with plates: ${total}`,
        ``,
        `You can download the full document here:`,
        options.pdfUrl,
        ``,
        `The breakdown covers duty, VAT and excise, each assessed on its own base,`,
        `with the regulation cited line by line.`,
        ``,
        `Automoción OS`,
      ].join("\n");

  return { to: options.to, subject, body };
}
