/**
 * De código de etapa del motor a `LineItemKind` persistido, como REGISTRO.
 *
 * El motor nombra sus etapas por dónde ocurren (`FREIGHT.OCEAN`); la base las
 * clasifica por qué son (`INTERNATIONAL_FREIGHT`), porque los informes agrupan
 * por naturaleza del costo y no por etapa de cálculo. Traducir entre los dos
 * vocabularios es un mapa, no una cadena de `if`: añadir un tributo nuevo debe
 * ser añadir una línea aquí, nunca editar una función.
 *
 * Las reglas de costo de destino son dinámicas —el administrador crea las que
 * necesite— así que se resuelven por prefijo con su propio mapa y caen en
 * `OTHER` si son nuevas. `OTHER` es una clasificación honesta de algo que
 * todavía no hemos categorizado; inventarle una categoría cercana falsearía los
 * informes.
 */

export type LineItemKind =
  | "VEHICLE_FOB"
  | "AUCTION_FEE"
  | "ORIGIN_INLAND"
  | "ORIGIN_DOCS"
  | "INTERNATIONAL_FREIGHT"
  | "INTERNATIONAL_INSURANCE"
  | "ARANCEL"
  | "IVA"
  | "IMPOCONSUMO"
  | "PORT_FEE"
  | "FREE_ZONE_FEE"
  | "CUSTOMS_BROKER_FEE"
  | "VUCE_FEE"
  | "ENVIRONMENTAL_FEE"
  | "HOMOLOGATION_FEE"
  | "INSPECTION_FEE"
  | "STORAGE_FEE"
  | "INLAND_DESTINATION"
  | "FINANCIAL_FEE"
  | "REGISTRATION_FEE"
  | "ADDON"
  | "MARGIN"
  | "DISCOUNT"
  | "ROUNDING"
  | "OTHER";

/** Etapas fijas del motor. */
const BY_STAGE_CODE: Record<string, LineItemKind> = {
  "ORIGIN.PURCHASE": "VEHICLE_FOB",
  "ORIGIN.AUCTION_FEE": "AUCTION_FEE",
  "ORIGIN.BUYER_FEE": "AUCTION_FEE",
  "ORIGIN.INLAND": "ORIGIN_INLAND",
  "ORIGIN.EXPORT_DOCS": "ORIGIN_DOCS",

  "FREIGHT.FOB": "VEHICLE_FOB",
  "FREIGHT.OCEAN": "INTERNATIONAL_FREIGHT",
  "FREIGHT.SURCHARGES": "INTERNATIONAL_FREIGHT",
  "FREIGHT.INSURANCE": "INTERNATIONAL_INSURANCE",
  "FREIGHT.CIF": "OTHER",

  "TAX.ARANCEL": "ARANCEL",
  "TAX.IVA": "IVA",
  "TAX.IMPOCONSUMO": "IMPOCONSUMO",

  "COMMERCIAL.MARGIN": "MARGIN",
  "COMMERCIAL.SERVICE_FEE": "FINANCIAL_FEE",
  "COMMERCIAL.PAYMENT": "FINANCIAL_FEE",
  "COMMERCIAL.GMF": "FINANCIAL_FEE",
};

/**
 * Reglas de destino, por el código que el administrador les da.
 *
 * Se busca por coincidencia de subcadena porque los códigos llevan el puerto
 * (`PORT_UIP_BUN`, `STORAGE_BUN`) y la clasificación no depende del puerto.
 */
const DESTINATION_PATTERNS: readonly [string, LineItemKind][] = [
  ["PORT", "PORT_FEE"],
  ["FREE_ZONE", "FREE_ZONE_FEE"],
  ["BROKER", "CUSTOMS_BROKER_FEE"],
  ["VUCE", "VUCE_FEE"],
  ["ENVIRON", "ENVIRONMENTAL_FEE"],
  ["HOMOLOG", "HOMOLOGATION_FEE"],
  ["INSPECT", "INSPECTION_FEE"],
  ["STORAGE", "STORAGE_FEE"],
  ["INLAND", "INLAND_DESTINATION"],
  ["PLATES", "REGISTRATION_FEE"],
  ["PERMIT", "REGISTRATION_FEE"],
  ["RUNT", "REGISTRATION_FEE"],
  ["SOAT", "REGISTRATION_FEE"],
];

const DESTINATION_PREFIX = "DESTINATION.";
const ADDON_PREFIX = "ADDON.";

export function lineItemKindFor(stageCode: string): LineItemKind {
  const exact = BY_STAGE_CODE[stageCode];
  if (exact) return exact;

  if (stageCode.startsWith(ADDON_PREFIX)) return "ADDON";

  if (stageCode.startsWith(DESTINATION_PREFIX)) {
    const code = stageCode.slice(DESTINATION_PREFIX.length);
    const match = DESTINATION_PATTERNS.find(([needle]) => code.includes(needle));
    return match ? match[1] : "OTHER";
  }

  return "OTHER";
}
