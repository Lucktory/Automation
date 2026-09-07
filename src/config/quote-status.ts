import type { QuoteStatus } from "@prisma/client";
import type { PillTone } from "./role-display";

/**
 * Presentación de los estados de cotización, como REGISTRO compartido.
 *
 * Vivía dentro de la pantalla de cotizaciones, y en cuanto el panel de control
 * empezó a pintar las mismas píldoras aparecieron dos verdades sobre el mismo
 * dato. Aquí hay una sola.
 *
 * Es un `Record` completo a propósito: añadir un estado al enum obliga al
 * compilador a exigir etiqueta y tono, en vez de dejar una píldora vacía en
 * pantalla. Y cada miembro tiene su propia clave —VIEWED no comparte etiqueta
 * con SENT— porque la diferencia entre «enviada» y «vista» es exactamente el
 * dato que un comercial mira en la tabla.
 *
 * El color codifica el estado, nunca decora: gris lo inerte, azul lo que está
 * en manos del cliente, verde lo cerrado, rojo lo perdido.
 */

export interface QuoteStatusDisplay {
  /** Clave dentro de `admin.common.quoteStatus`. */
  key: string;
  tone: PillTone;
}

export const QUOTE_STATUS_DISPLAY: Record<QuoteStatus, QuoteStatusDisplay> = {
  DRAFT: { key: "draft", tone: "muted" },
  INTERNAL_REVIEW: { key: "internalReview", tone: "warning" },
  SENT: { key: "sent", tone: "info" },
  VIEWED: { key: "viewed", tone: "primary" },
  ACCEPTED: { key: "accepted", tone: "success" },
  REJECTED: { key: "rejected", tone: "danger" },
  EXPIRED: { key: "expired", tone: "muted" },
  SUPERSEDED: { key: "superseded", tone: "muted" },
  CONVERTED: { key: "converted", tone: "primary" },
  CANCELLED: { key: "cancelled", tone: "danger" },
};

/** Estados que siguen vivos: ni cerrados, ni caducados, ni reemplazados. */
export const QUOTE_STATUSES_OPEN = ["DRAFT", "INTERNAL_REVIEW", "SENT", "VIEWED"] as const;

/** Estados en los que la pelota está en el tejado del cliente. */
export const QUOTE_STATUSES_IN_PLAY = ["SENT", "VIEWED"] as const;
