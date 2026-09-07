import type { LeadSource, LeadStatus } from "@prisma/client";
import type { PillTone } from "./role-display";

/**
 * Presentación de los prospectos: de dónde vienen y en qué punto están.
 *
 * `Record` completos a propósito: añadir un miembro al enum obliga al compilador
 * a exigir etiqueta y color aquí, en vez de dejar una píldora en blanco en una
 * tabla que alguien va a leer para decidir a quién llamar hoy.
 *
 * Las FUENTES no usan los tonos semánticos del sistema (verde = bien, rojo =
 * mal): una fuente no es buena ni mala, sólo distinta, y pintarlas con la paleta
 * de estados haría creer que Instagram va mejor que Facebook. Por eso llevan una
 * paleta propia, apagada y sin significado, cuyo único trabajo es que dos filas
 * seguidas de orígenes distintos se distingan de un vistazo.
 */

export interface LeadSourceDisplay {
  /** Clave i18n dentro de `admin.sections.clients.sources`. */
  key: string;
  /** Clases Tailwind de la píldora. Paleta propia, deliberadamente neutra. */
  className: string;
}

export const LEAD_SOURCE_DISPLAY: Record<LeadSource, LeadSourceDisplay> = {
  WEB_FORM: { key: "webForm", className: "bg-[#e3ecfb] text-[#1c4e8f]" },
  QUOTE_SIMULATOR: { key: "simulator", className: "bg-[#ece5fb] text-[#5b3fa8]" },
  CHATBOT: { key: "chatbot", className: "bg-[#e4eef0] text-[#2f6169]" },
  WHATSAPP: { key: "whatsapp", className: "bg-[#e0f2e6] text-[#1f6b40]" },
  INSTAGRAM: { key: "instagram", className: "bg-[#fbe4ee] text-[#9c2a63]" },
  FACEBOOK: { key: "facebook", className: "bg-[#e2eafc] text-[#27479b]" },
  TUCARRO: { key: "tucarro", className: "bg-[#fdeadf] text-[#9a4a1c]" },
  CARROYA: { key: "carroya", className: "bg-[#fbf3d9] text-[#84631a]" },
  MARKETPLACE: { key: "marketplace", className: "bg-[#e8eaee] text-[#464f5c]" },
  REFERRAL: { key: "referral", className: "bg-[#e6edf0] text-[#2d5566]" },
  PAID_ADS: { key: "paidAds", className: "bg-[#fae7e4] text-[#96331f]" },
  ORGANIC: { key: "organic", className: "bg-[#e3f0e3] text-[#2c6134]" },
  OTHER: { key: "other", className: "bg-[#eaecef] text-[#5a626c]" },
};

/** Orden del selector «Origen»: primero las que más entran. */
export const LEAD_SOURCE_ORDER: readonly LeadSource[] = [
  "WEB_FORM",
  "QUOTE_SIMULATOR",
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
  "TUCARRO",
  "CARROYA",
  "REFERRAL",
  "PAID_ADS",
  "ORGANIC",
  "CHATBOT",
  "MARKETPLACE",
  "OTHER",
];

/**
 * En qué punto del embudo comercial está una persona.
 *
 * Los ocho estados del enum se resumen en los tres que el equipo nombra en voz
 * alta. Aquí sí manda el color semántico, porque «cliente» y «perdido» no son
 * categorías equivalentes: una es dinero cobrado y la otra es dinero que se fue.
 */
export type ClientStage = "client" | "prospect" | "inactive";

export const CLIENT_STAGE_TONE: Record<ClientStage, PillTone> = {
  client: "success",
  prospect: "info",
  inactive: "muted",
};

/** Estados que cuentan como cliente ganado. */
export const LEAD_STATUS_STAGE: Record<LeadStatus, ClientStage> = {
  NEW: "prospect",
  CONTACTED: "prospect",
  QUALIFIED: "prospect",
  QUOTED: "prospect",
  NEGOTIATING: "prospect",
  WON: "client",
  LOST: "inactive",
  NURTURING: "prospect",
};
