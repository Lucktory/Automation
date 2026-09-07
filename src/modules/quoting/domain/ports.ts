import type {
  AddOnInput,
  DestinationCostInput,
  Powertrain,
} from "@/modules/pricing";
import type { TariffRuleCandidate } from "@/modules/parameters";
import type { LineItemKind } from "@/config/line-item-kinds";

/**
 * Puertos del módulo de cotización.
 *
 * El motor es puro y no sabe leer una base de datos. Estos puertos son lo que
 * le acerca los parámetros: el módulo los pide, la infraestructura los trae, y
 * el motor recibe un objeto plano que podría haber salido de cualquier sitio.
 */

export interface VehicleForQuote {
  id: string;
  slug: string;
  label: string;
  hsCode: string;
  powertrain: Powertrain;
  /** País de FABRICACIÓN: decide el TLC. No es el de compra. */
  originCountry: string;
  shipFromCountry: string;
  originPortId: string | null;
  modelYear: number;
  weightKg: number;
  cbm: number;
  fobUsd: number;
  purchasePriceUsd: number;
  imageUrl: string | null;
  /** Ficha técnica. Opcional: no todo el catálogo la tiene completa. */
  bodyType: string;
  rangeKm: number | null;
  rangeStandard: string | null;
  horsepowerHp: number | null;
  seats: number | null;
}

export interface FreightRateRow {
  id: string;
  originPortId: string;
  destinationPortId: string;
  mode: string;
  amountUsd: number;
  surchargesUsd: number;
  transitDaysMin: number;
  transitDaysMax: number;
  vehiclesPerUnit: number;
  confidence: "VERIFIED" | "ESTIMATED" | "UNVERIFIED";
  verifiedAt: Date | null;
  staleAfterDays: number;
}

export interface MarginRow {
  code: string;
  method: string;
  rate: number | null;
  amount: number | null;
  appliesToDepositOnly: boolean;
}

export interface PortRow {
  id: string;
  unlocode: string;
  name: string;
  countryCode: string;
  isOrigin: boolean;
  isDestination: boolean;
  freeDaysDefault: number | null;
}

export interface FxSnapshot {
  /** TRM del día: la que se muestra. */
  commercial: number;
  /**
   * TRM del último día hábil de la semana anterior: la que liquida los
   * tributos (Dto 1165/2019 art. 15). Distinta de la comercial a propósito.
   */
  fiscal: number;
  date: Date;
  source: "AUTO" | "MANUAL" | "CACHE";
  ageDays: number;
}

export interface QuotingRepositories {
  vehicles: {
    publishedForQuote(limit: number): Promise<VehicleForQuote[]>;
    byId(id: string): Promise<VehicleForQuote | null>;
  };
  ports: {
    all(): Promise<PortRow[]>;
  };
  freight: {
    /**
     * Tarifa de la ruta. Con `mode` devuelve esa modalidad o `null`; sin él,
     * la vigente más reciente sea cual sea la modalidad.
     *
     * `null` NO significa flete cero: significa que no hay tarifa cargada, y
     * quien llame debe decirlo en pantalla en vez de cotizar un cero.
     */
    forRoute(
      parameterSetId: string,
      originPortId: string,
      destinationPortId: string,
      on: Date,
      mode?: string,
    ): Promise<FreightRateRow | null>;
    /** Modalidades con tarifa vigente en la ruta, para no ofrecer las que no la tienen. */
    modesForRoute(
      parameterSetId: string,
      originPortId: string,
      destinationPortId: string,
      on: Date,
    ): Promise<string[]>;
  };
  destination: {
    forSet(parameterSetId: string, portId: string | null, on: Date): Promise<DestinationCostInput[]>;
  };
  margins: {
    forSet(parameterSetId: string): Promise<MarginRow[]>;
  };
  addOns: {
    forSet(parameterSetId: string): Promise<(AddOnInput & { requiresPowertrain: Powertrain[] })[]>;
  };
  tariffs: {
    candidatesFor(parameterSetId: string, hsCode: string): Promise<TariffRuleCandidate[]>;
  };
  fx: {
    snapshot(on: Date): Promise<FxSnapshot>;
  };
}

/**
 * Lo que hay que escribir para emitir una cotización.
 *
 * Se pasa completo y de una vez a propósito: la cabecera, sus vehículos y sus
 * líneas se escriben en UNA transacción, junto con el consecutivo. Escribir la
 * cabecera primero y las líneas después deja, ante cualquier fallo intermedio,
 * una cotización que ya reservó un número y nunca podrá reimprimirse.
 */
export interface QuoteDraft {
  parameterSetId: string;
  locale: string;
  customerId: string | null;
  createdById: string | null;
  trmCommercial: number;
  trmFiscal: number;
  trmDate: Date;
  subtotalUsd: number;
  taxesCop: number;
  landedCostCop: number;
  totalCop: number;
  totalCopCeiling: number | null;
  resolutionStatus: "VALOR" | "VALOR_CON_ADVERTENCIA" | "NO_COTIZABLE";
  estimatedDays: number;
  validUntil: Date;
  snapshot: unknown;
  snapshotVersion: number;
  vehicles: QuoteVehicleDraft[];
  lineItems: QuoteLineItemDraft[];
}

export interface QuoteVehicleDraft {
  vehicleId: string | null;
  descriptionEs: string;
  hsCodeValue: string | null;
  powertrain: Powertrain | null;
  originCountryCode: string | null;
  modelYear: number | null;
  fobUsd: number;
  cifUsd: number;
  landedCostCop: number;
  containerShare: number;
}

export interface QuoteLineItemDraft {
  stageCode: string;
  kind: LineItemKind;
  block: string;
  labelEs: string;
  labelEn: string;
  noteEs: string | null;
  noteEn: string | null;
  currency: "COP" | "USD";
  amountUsd: number | null;
  amountCop: number;
  appliedRuleId: string | null;
  appliedRuleKind: string | null;
  legalBasis: string | null;
  baseKind: string | null;
  baseAmountCop: number | null;
  rateApplied: number | null;
  resolutionStatus: "VALOR" | "VALOR_CON_ADVERTENCIA" | "NO_COTIZABLE";
  warning: string | null;
  sortOrder: number;
}

export interface IssuedQuote {
  id: string;
  reference: string;
  issueYear: number;
  sequence: number;
  validUntil: Date;
}

export interface QuoteRepository {
  /**
   * Emite la cotización: asigna el consecutivo del año y escribe todo, en una
   * sola transacción. `issueYear` viene del año civil EN BOGOTÁ, ya resuelto
   * por quien llama — nunca se deduce aquí de un reloj en UTC.
   */
  issue(draft: QuoteDraft, issueYear: number): Promise<IssuedQuote>;
}
