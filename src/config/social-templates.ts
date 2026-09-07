import type { SocialTemplate } from "@prisma/client";

/**
 * Las plantillas de pieza social, como REGISTRO.
 *
 * Una pieza no es una imagen suelta: es un formato con un tamaño fijo, un canal
 * al que va destinada y una MANERA de colocar la foto, el nombre y el precio.
 * Las tres cosas viven aquí, así que añadir un formato es añadir una fila y una
 * rama de composición, no tocar la pantalla.
 *
 * Los tamaños son los reales de cada red en 2026 y no son intercambiables: una
 * historia de Instagram entregada en 1080×1080 sale recortada, así que el marco
 * de la vista previa reproduce la proporción exacta. Que la rejilla se vea
 * desigual es el punto — las piezas TIENEN alturas distintas.
 */

/** Cómo se compone la pieza. La pantalla dibuja según esto, no según el nombre. */
export type SocialLayout =
  /** Foto a sangre; titular arriba, precio abajo sobre un velo oscuro. */
  | "hero"
  /** Vertical: la mitad inferior es del precio. */
  | "story"
  /** Foto grande y una tira de miniaturas debajo. */
  | "gallery"
  /** Fondo claro: texto arriba, foto en medio, precio abajo. */
  | "card"
  /** Apaisada: foto a la derecha, texto y llamada a la acción a la izquierda. */
  | "link";

export interface SocialTemplateSpec {
  /** Clave i18n dentro de `admin.sections.social.templates`. */
  key: string;
  width: number;
  height: number;
  /** Red o aplicación a la que va destinada. */
  channel: string;
  layout: SocialLayout;
}

export const SOCIAL_TEMPLATES: Record<SocialTemplate, SocialTemplateSpec> = {
  IG_SQUARE_SPEC: { key: "square", width: 1080, height: 1080, channel: "Instagram", layout: "hero" },
  IG_STORY_PRICE: { key: "story", width: 1080, height: 1920, channel: "Instagram", layout: "story" },
  IG_CAROUSEL_GALLERY: {
    key: "carousel",
    width: 1080,
    height: 1080,
    channel: "Instagram",
    layout: "gallery",
  },
  WA_CATALOG_CARD: { key: "catalog", width: 800, height: 800, channel: "WhatsApp", layout: "card" },
  OG_IMAGE: { key: "link", width: 1200, height: 630, channel: "Open Graph", layout: "link" },
};

/** Orden de presentación en filtros y rejilla: el mismo que en el diseño. */
export const SOCIAL_TEMPLATE_ORDER: readonly SocialTemplate[] = [
  "IG_SQUARE_SPEC",
  "IG_STORY_PRICE",
  "IG_CAROUSEL_GALLERY",
  "WA_CATALOG_CARD",
  "OG_IMAGE",
];

/** Las dos que se marcan por defecto al generar: son las que más se publican. */
export const SOCIAL_TEMPLATES_DEFAULT: readonly SocialTemplate[] = [
  "IG_SQUARE_SPEC",
  "IG_STORY_PRICE",
];

export const dimensionsOf = (template: SocialTemplate): string => {
  const spec = SOCIAL_TEMPLATES[template];
  return `${spec.width} × ${spec.height}`;
};
