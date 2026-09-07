import type { Money } from "@/core/money";

/**
 * Contrato del motor de liquidación.
 *
 * Este archivo NO importa Prisma, Next ni React — está prohibido por lint. Los
 * tipos del dominio son propios, y la capa de infraestructura mapea desde el
 * esquema hacia aquí. Esa separación es lo que permite que la misma función
 * corra en el servidor para la cotización oficial y en el navegador para el
 * simulador en vivo, y que se pruebe sin base de datos.
 */

// ---------------------------------------------------------------------------
// Vocabulario del dominio
// ---------------------------------------------------------------------------

export type Powertrain =
  | "BEV"
  | "PHEV"
  | "HEV"
  | "MHEV"
  | "GASOLINE"
  | "DIESEL"
  | "FCEV"
  | "CNG"
  | "LPG"
  | "FLEX";

export type CostBlock =
  | "ORIGIN"
  | "FREIGHT"
  | "TAX"
  | "DESTINATION"
  | "ADDON"
  | "COMMERCIAL";

/**
 * Cómo termina la resolución de un parámetro.
 *
 * El motor NUNCA devuelve un valor por defecto en silencio. Ante un dato
 * ausente, vencido o ambiguo toma el lado caro y lo marca. Sobrecotizar pierde
 * un negocio; subcotizar destruye la empresa.
 */
export type ResolutionStatus =
  | "VALOR"
  | "VALOR_CON_ADVERTENCIA"
  | "NO_COTIZABLE";

/**
 * Bases gravables. Son DISTINTAS entre sí a propósito.
 *
 *   CIF                  → base del arancel        (Dto 1165/2019 art. 16)
 *   CIF_PLUS_ARANCEL     → base del IVA, y solo del IVA (ET art. 459)
 *   TOTAL_VALUE_EXCL_IVA → base del impoconsumo    (ET art. 512-3 par. 3)
 *
 * El IVA y el impoconsumo se calculan EN PARALELO desde bases distintas: ningún
 * tributo entra en la base de otro, salvo el arancel, que entra en las dos.
 */
export type TaxBaseKind =
  | "FOB"
  | "CIF"
  | "CIF_PLUS_ARANCEL"
  | "TOTAL_VALUE_EXCL_IVA"
  | "LANDED";

export type DataConfidence = "VERIFIED" | "ESTIMATED" | "UNVERIFIED";

export type ProrationMethod =
  | "EQUAL_SHARE"
  | "BY_FOB_VALUE"
  | "BY_CIF_VALUE"
  | "BY_CBM"
  | "BY_WEIGHT"
  | "MANUAL";

/** Prorrateo de la BASE GRAVABLE: más estrecho que el comercial (Res. 1684 CAN). */
export type TaxableBaseProrationMethod = "BY_FOB_VALUE" | "BY_WEIGHT";

export type CalcMethod =
  | "FIXED"
  | "PER_VEHICLE"
  | "PER_CONTAINER"
  | "PER_DAY"
  | "PERCENT_OF_FOB"
  | "PERCENT_OF_CIF"
  | "PERCENT_OF_LANDED"
  | "PERCENT_OF_SUBTOTAL";

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

export interface VehicleFiscalProfile {
  /** Subpartida a 10 dígitos exactos, sin puntos. Nunca resolver por "8703". */
  hsCode: string;
  powertrain: Powertrain;
  /** País de FABRICACIÓN. Decide el TLC. NO es el país de compra. */
  originCountry: string;
  /** País desde el que embarca. Puede diferir del de origen. */
  shipFromCountry: string;
  modelYear: number;
  /** true solo si existe certificado de origen válido y expedición directa. */
  hasOriginCertificate: boolean;
  weightKg: number;
  cbm: number;
}

export interface OriginCostsInput {
  purchasePriceUsd: number;
  auctionFeeUsd: number;
  buyerFeeUsd: number;
  inlandFreightUsd: number;
  exportDocsUsd: number;
  otherUsd: number;
}

export interface FreightInput {
  /** Costo total del contenedor, NO por unidad. */
  containerCostUsd: number;
  surchargesUsd: number;
  /** Prima como fracción sobre (FOB + flete). */
  insuranceRate: number;
  insuranceMinimumUsd: number;
  /** Recargo habitual sobre el valor asegurado, p. ej. 0.1 = +10%. */
  insuredValueUplift: number;
  transitDays: number;
  /** Antigüedad de la tarifa, para advertir. */
  quotedDaysAgo?: number;
  staleAfterDays?: number;
}

export interface ConsolidationUnit {
  reference: string;
  fobUsd: number;
  weightKg: number;
  cbm: number;
  manualShare?: number;
}

export interface ConsolidationInput {
  /** Unidades que comparten el contenedor. La primera es la que se liquida. */
  units: ConsolidationUnit[];
  commercialMethod: ProrationMethod;
  taxableBaseMethod: TaxableBaseProrationMethod;
}

export interface TariffResolution {
  ruleId: string;
  dutyRate: number;
  vatRate: number;
  exciseRate: number;
  dutyBase: TaxBaseKind;
  vatBase: TaxBaseKind;
  exciseBase: TaxBaseKind;
  exciseThresholdFobUsd: number | null;
  exciseRateAboveThreshold: number | null;
  /**
   * El impoconsumo solo se causa en la importación cuando el importador ES el
   * consumidor final (ET art. 512-1 num. 2). Si no, se causa en la venta.
   */
  exciseAppliesOnImport: boolean;
  requiresOriginCertificate: boolean;
  legalBasis: string;
  confidence: DataConfidence;
  status: ResolutionStatus;
  warning?: string;
}

export interface DestinationCostInput {
  code: string;
  labelKey: string;
  method: CalcMethod;
  currency: "COP" | "USD";
  amount: number;
  rate?: number;
  minimum?: number;
  days?: number;
  /** Si entra en la base gravable del impoconsumo. Parámetro, no supuesto. */
  inExciseBase: boolean;
  confidence: DataConfidence;
  legalBasis?: string;
}

export interface AddOnInput {
  code: string;
  labelKey: string;
  stage: "ORIGIN" | "DESTINATION";
  currency: "COP" | "USD";
  price: number;
}

export interface CommercialInput {
  marginRate: number;
  serviceFeeCop: number;
  paymentProcessingRate: number;
  /** El anticipo: única base posible del costo de pasarela en Colombia. */
  depositCop: number;
  gmfRate: number;
}

export interface FxInput {
  /** TRM comercial: la de hoy. Para mostrar. */
  trmCommercial: number;
  /**
   * TRM fiscal: último día hábil de la semana anterior a la aceptación de la
   * declaración (Dto 1165/2019 art. 15). Es la que liquida los tributos.
   */
  trmFiscal: number;
  trmDate: string;
  trmSource: "AUTO" | "MANUAL" | "CACHE";
  /** Días desde la última publicación, para advertir si está vieja. */
  trmAgeDays: number;
}

/**
 * Días hábiles por fase.
 *
 * Ninguno se codifica: la navegación viene de la tarifa de flete de la ruta y
 * los días en puerto del interruptor correspondiente, así que cambiar de origen
 * mueve el plazo igual que mueve el precio.
 */
export interface TimelineInput {
  sourcingDays: number;
  inlandOriginDays: number;
  oceanDays: number;
  portReleaseDays: number;
  nationalizationDays: number;
  registrationDays: number;
}

export interface TimelineEstimate extends TimelineInput {
  totalDays: number;
}

/** Los seis interruptores que deciden si el motor cotiza barato o caro. */
export interface DeterminingSwitches {
  importerIsEndConsumer: boolean;
  portDays: number;
}

export interface LiquidationInput {
  vehicle: VehicleFiscalProfile;
  origin: OriginCostsInput;
  freight: FreightInput;
  consolidation: ConsolidationInput;
  tariff: TariffResolution;
  destination: DestinationCostInput[];
  addOns: AddOnInput[];
  commercial: CommercialInput;
  fx: FxInput;
  switches: DeterminingSwitches;
  timeline: TimelineInput;
}

// ---------------------------------------------------------------------------
// Salidas
// ---------------------------------------------------------------------------

export interface LineItem {
  /** Código estable: también la clave i18n (pricing.stages.TAX.ARANCEL). */
  code: string;
  block: CostBlock;
  amountUsd: Money | null;
  amountCop: Money;
  /** Trazabilidad: qué base y qué tasa produjeron esta línea. */
  baseKind?: TaxBaseKind;
  baseAmountCop?: Money;
  rateApplied?: number;
  legalBasis?: string;
  appliedRuleId?: string;
  status: ResolutionStatus;
  warning?: string;
  displayOrder: number;
  /**
   * Marca las líneas que son SUBTOTALES (FOB, CIF), no costos nuevos. Se
   * excluyen de toda suma para que no se cuenten dos veces, pero se muestran en
   * el desglose porque el lector necesita verlas.
   */
  isSubtotal?: boolean;
}

export interface ProrationRow {
  reference: string;
  weight: number;
  share: number;
  allocated: Money;
  isResidueBearer: boolean;
}

export interface ProrationResult {
  method: ProrationMethod | TaxableBaseProrationMethod;
  rows: ProrationRow[];
  total: Money;
  /** Diferencia entre el reparto proporcional exacto y el asignado. Visible. */
  residue: Money;
}

export interface EngineWarning {
  code: string;
  level: "INFO" | "WARN" | "BLOCK";
  message: string;
}

export interface LiquidationResult {
  lineItems: LineItem[];
  fobUsd: Money;
  cifUsd: Money;
  cifCop: Money;
  taxesCop: Money;
  destinationCop: Money;
  addOnsCop: Money;
  landedCostCop: Money;
  totalCop: Money;
  /** Techo de la banda cuando queda algún interruptor sin cerrar. */
  totalCopCeiling: Money | null;
  freightProration: ProrationResult;
  taxableBaseProration: ProrationResult;
  timeline: TimelineEstimate;
  status: ResolutionStatus;
  warnings: EngineWarning[];
  fx: FxInput;
}
