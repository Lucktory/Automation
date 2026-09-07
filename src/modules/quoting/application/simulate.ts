import {
  liquidate,
  TariffRuleNotFoundError,
  type AddOnInput,
  type CommercialInput,
  type ConsolidationUnit,
  type DestinationCostInput,
  type LiquidationInput,
  type LiquidationResult,
  type ProrationMethod,
  type TaxableBaseProrationMethod,
} from "@/modules/pricing";
import { resolveTariff, type ParameterSetSummary } from "@/modules/parameters";
import { TIMELINE_DEFAULT_DAYS } from "@/config/timeline-defaults";
import type { FxSnapshot, FreightRateRow, QuotingRepositories, VehicleForQuote } from "../domain/ports";

/**
 * Ensambla la entrada del motor a partir de la base de datos y la ejecuta.
 *
 * Es la única pieza que traduce "filas de parámetros" a "LiquidationInput".
 * El motor sigue siendo puro; esta función es la que sabe dónde vive cada cosa.
 *
 * El mismo ensamblaje sirve al simulador, a la cotización oficial y al PDF, así
 * que los tres calculan por definición lo mismo. Tres caminos distintos hacia
 * el mismo número es como se acaba con tres números distintos.
 */

export interface SimulationOverrides {
  purchasePriceUsd?: number;
  auctionFeeUsd?: number;
  buyerFeeUsd?: number;
  inlandFreightUsd?: number;
  exportDocsUsd?: number;
  containerCostUsd?: number;
  surchargesUsd?: number;
  insuranceRate?: number;
  portDays?: number;
  marginRate?: number;
}

export interface SimulationRequest {
  vehicleId: string;
  destinationPortId: string;
  /** Modalidad de transporte. Sin ella se toma la tarifa vigente de la ruta. */
  mode?: string;
  /** Unidades que comparten el contenedor, incluida esta. */
  unitsInContainer: number;
  commercialMethod: ProrationMethod;
  taxableBaseMethod: TaxableBaseProrationMethod;
  addOnCodes: readonly string[];
  importerIsEndConsumer: boolean;
  hasOriginCertificate: boolean;
  overrides?: SimulationOverrides;
  on?: Date;
}

/** Todo lo que el navegador necesita para recalcular sin volver al servidor. */
export interface SimulatorBundle {
  parameterSet: ParameterSetSummary;
  vehicles: VehicleForQuote[];
  ports: { id: string; name: string; unlocode: string }[];
  addOns: AddOnInput[];
  fx: FxSnapshot;
}

const DEFAULT_INSURANCE_RATE = 0.012;
const DEFAULT_INSURANCE_MINIMUM_USD = 150;
const DEFAULT_INSURED_UPLIFT = 0.1;
const DEFAULT_PORT_DAYS = 6;
const DEFAULT_DEPOSIT_COP = 20_000_000;
const DAYS = 24 * 60 * 60 * 1000;

function marginsToCommercial(
  margins: readonly { code: string; rate: number | null; amount: number | null }[],
  overrides: SimulationOverrides | undefined,
): CommercialInput {
  const rateOf = (code: string) => margins.find((m) => m.code === code)?.rate ?? 0;
  const amountOf = (code: string) => margins.find((m) => m.code === code)?.amount ?? 0;

  return {
    marginRate: overrides?.marginRate ?? rateOf("MARGIN"),
    serviceFeeCop: amountOf("SERVICE_FEE"),
    paymentProcessingRate: rateOf("PAYMENT_FEE"),
    depositCop: DEFAULT_DEPOSIT_COP,
    gmfRate: rateOf("GMF"),
  };
}

/**
 * Construye las unidades del contenedor.
 *
 * La primera es la que se liquida. Las demás se clonan de ella: sin un
 * contenedor real que consultar, repartir entre unidades idénticas es la
 * hipótesis honesta — y hace que el efecto de compartir sea exactamente
 * `1/n`, que es lo que el comprador espera entender.
 */
function buildUnits(vehicle: VehicleForQuote, count: number): ConsolidationUnit[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    reference: index === 0 ? vehicle.label : `${vehicle.label} (${index + 1})`,
    fobUsd: vehicle.fobUsd,
    weightKg: vehicle.weightKg,
    cbm: vehicle.cbm,
  }));
}

function freightInput(
  freight: FreightRateRow,
  overrides: SimulationOverrides | undefined,
  now: Date,
) {
  const quotedDaysAgo =
    freight.verifiedAt != null
      ? Math.floor((now.getTime() - freight.verifiedAt.getTime()) / DAYS)
      : undefined;

  return {
    containerCostUsd: overrides?.containerCostUsd ?? freight.amountUsd,
    surchargesUsd: overrides?.surchargesUsd ?? freight.surchargesUsd,
    insuranceRate: overrides?.insuranceRate ?? DEFAULT_INSURANCE_RATE,
    insuranceMinimumUsd: DEFAULT_INSURANCE_MINIMUM_USD,
    insuredValueUplift: DEFAULT_INSURED_UPLIFT,
    transitDays: freight.transitDaysMax,
    ...(quotedDaysAgo !== undefined ? { quotedDaysAgo } : {}),
    staleAfterDays: freight.staleAfterDays,
  };
}

export class VehicleNotFoundError extends Error {
  constructor(id: string) {
    super(`No existe el vehículo ${id}.`);
    this.name = "VehicleNotFoundError";
  }
}

export class NoActiveParameterSetError extends Error {
  constructor() {
    super("No hay un conjunto de parámetros activo. Ejecuta la siembra.");
    this.name = "NoActiveParameterSetError";
  }
}

/**
 * No hay tarifa de flete vigente para la ruta y modalidad pedidas.
 *
 * Se lanza en vez de dejar el flete en cero, por la misma razón que la ausencia
 * de regla arancelaria no es una exención: un cero silencioso subcotiza, y
 * subcotizar es el error que cuesta dinero. Sin tarifa no hay cotización.
 */
export class FreightRateNotFoundError extends Error {
  constructor(
    readonly originPortId: string,
    readonly destinationPortId: string,
    readonly mode: string | undefined,
  ) {
    super(
      `No hay tarifa de flete vigente ${mode ? `en modalidad ${mode} ` : ""}para la ruta ${originPortId} → ${destinationPortId}.`,
    );
    this.name = "FreightRateNotFoundError";
  }
}

/**
 * Ensambla `LiquidationInput` sin ejecutarlo.
 *
 * Se expone aparte porque el simulador necesita la ENTRADA para poder
 * recalcular en el navegador cuando el usuario mueve un control, sin una ida y
 * vuelta al servidor por cada tecla.
 */
export async function assembleInput(
  repos: QuotingRepositories,
  activeSet: ParameterSetSummary,
  request: SimulationRequest,
): Promise<LiquidationInput> {
  const now = request.on ?? new Date();

  const vehicle = await repos.vehicles.byId(request.vehicleId);
  if (!vehicle) throw new VehicleNotFoundError(request.vehicleId);

  const [freight, destinationRules, margins, addOns, candidates, fx] = await Promise.all([
    vehicle.originPortId
      ? repos.freight.forRoute(
          activeSet.id,
          vehicle.originPortId,
          request.destinationPortId,
          now,
          request.mode,
        )
      : Promise.resolve(null),
    repos.destination.forSet(activeSet.id, request.destinationPortId, now),
    repos.margins.forSet(activeSet.id),
    repos.addOns.forSet(activeSet.id),
    repos.tariffs.candidatesFor(activeSet.id, vehicle.hsCode),
    repos.fx.snapshot(now),
  ]);

  if (!freight) {
    throw new FreightRateNotFoundError(
      vehicle.originPortId ?? "—",
      request.destinationPortId,
      request.mode,
    );
  }

  // Lanza `TariffRuleNotFoundError` si no hay regla: la ausencia no es exención.
  const tariff = resolveTariff(candidates, {
    hsCode: vehicle.hsCode,
    originCountry: vehicle.originCountry,
    powertrain: vehicle.powertrain,
    on: now,
  });

  const chosenAddOns: AddOnInput[] = addOns
    .filter((addOn) => request.addOnCodes.includes(addOn.code))
    // Un wallbox sobre un vehículo de gasolina no es un extra, es un error.
    .filter(
      (addOn) =>
        addOn.requiresPowertrain.length === 0 ||
        addOn.requiresPowertrain.includes(vehicle.powertrain),
    )
    .map((addOn) => ({
      code: addOn.code,
      labelKey: addOn.labelKey,
      stage: addOn.stage,
      currency: addOn.currency,
      price: addOn.price,
    }));

  const destination: DestinationCostInput[] = destinationRules;

  return {
    vehicle: {
      hsCode: vehicle.hsCode,
      powertrain: vehicle.powertrain,
      originCountry: vehicle.originCountry,
      shipFromCountry: vehicle.shipFromCountry,
      modelYear: vehicle.modelYear,
      hasOriginCertificate: request.hasOriginCertificate,
      weightKg: vehicle.weightKg,
      cbm: vehicle.cbm,
    },
    origin: {
      purchasePriceUsd: request.overrides?.purchasePriceUsd ?? vehicle.purchasePriceUsd,
      auctionFeeUsd: request.overrides?.auctionFeeUsd ?? 0,
      buyerFeeUsd: request.overrides?.buyerFeeUsd ?? 0,
      inlandFreightUsd: request.overrides?.inlandFreightUsd ?? 0,
      exportDocsUsd: request.overrides?.exportDocsUsd ?? 0,
      otherUsd: 0,
    },
    freight: freightInput(freight, request.overrides, now),
    consolidation: {
      units: buildUnits(vehicle, request.unitsInContainer),
      commercialMethod: request.commercialMethod,
      taxableBaseMethod: request.taxableBaseMethod,
    },
    tariff,
    destination,
    addOns: chosenAddOns,
    commercial: marginsToCommercial(margins, request.overrides),
    fx: {
      trmCommercial: fx.commercial,
      trmFiscal: fx.fiscal,
      trmDate: fx.date.toISOString().slice(0, 10),
      trmSource: fx.source,
      trmAgeDays: fx.ageDays,
    },
    switches: {
      importerIsEndConsumer: request.importerIsEndConsumer,
      portDays: request.overrides?.portDays ?? DEFAULT_PORT_DAYS,
    },
    timeline: {
      ...TIMELINE_DEFAULT_DAYS,
      // Estos dos SÍ son datos: la ruta y el puerto elegidos.
      oceanDays: freight.transitDaysMax,
      portReleaseDays: request.overrides?.portDays ?? TIMELINE_DEFAULT_DAYS.portReleaseDays,
    },
  };
}

export async function simulate(
  repos: QuotingRepositories,
  activeSet: ParameterSetSummary,
  request: SimulationRequest,
): Promise<{ input: LiquidationInput; result: LiquidationResult }> {
  const input = await assembleInput(repos, activeSet, request);
  return { input, result: liquidate(input) };
}

export { TariffRuleNotFoundError };
