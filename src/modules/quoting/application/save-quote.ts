import { lineItemKindFor } from "@/config/line-item-kinds";
import { civilYearInBusinessZone } from "@/config/time";
import { liquidate, type LineItem, type LiquidationInput } from "@/modules/pricing";
import type { ParameterSetSummary } from "@/modules/parameters";
import {
  assertSnapshotBalances,
  buildSnapshot,
  SNAPSHOT_VERSION,
  type LineLabeller,
} from "../domain/snapshot";
import { quoteValidity } from "../domain/validity";
import type {
  IssuedQuote,
  QuoteDraft,
  QuoteLineItemDraft,
  QuoteRepository,
  QuotingRepositories,
} from "../domain/ports";
import { assembleInput, type SimulationRequest } from "./simulate";

/**
 * Emitir una cotización a partir de lo que el simulador tiene en pantalla.
 *
 * El problema que resuelve —y que no es obvio— es que el simulador calcula EN
 * EL NAVEGADOR durante toda la sesión, mientras que los parámetros viven en el
 * servidor y un administrador puede republicarlos en cualquier momento. La
 * secuencia peligrosa:
 *
 *   10:00  la página arma la entrada con el conjunto v7 (arancel 35 %)
 *   10:04  un administrador publica v8 (arancel 40 %)
 *   10:06  el cliente pulsa «Guardar cotización»
 *
 * Si aquí se volviera a pedir «el conjunto activo», se guardaría una cifra
 * distinta de la que el cliente tiene delante. Si se confiara en la entrada que
 * manda el navegador, se guardaría la aritmética de v7 con el sello de v8, y la
 * base legal citada en el PDF contradiría sus propias líneas.
 *
 * Por eso el navegador devuelve la IDENTIDAD del conjunto con el que calculó, y
 * aquí se rearma con ESE conjunto, se recalcula en el servidor y se compara con
 * la cifra que el cliente veía. Si no coinciden, no se guarda nada: se devuelve
 * `PARAMETERS_CHANGED` con las dos cifras para que la pantalla pida una
 * confirmación explícita. Nunca se emite en silencio un precio que el cliente
 * no vio.
 */

export interface SaveQuoteRequest {
  simulation: SimulationRequest;
  /** El conjunto con el que el navegador calculó. No se acepta otro. */
  parameterSetId: string;
  parameterSetVersion: number;
  /** El total que el cliente tiene en pantalla, en unidades mínimas (COP). */
  expectedTotalCopMinor: string;
  locale: string;
  customerId: string | null;
  createdById: string | null;
}

export type SaveQuoteResult =
  | { ok: true; quote: IssuedQuote; bornStale: boolean }
  | {
      ok: false;
      reason: "PARAMETERS_CHANGED";
      expectedTotalCopMinor: string;
      actualTotalCopMinor: string;
    }
  | { ok: false; reason: "NOT_QUOTABLE"; message: string }
  | { ok: false; reason: "PARAMETER_SET_GONE"; message: string };

export interface SaveQuoteDeps {
  repos: QuotingRepositories;
  quotes: QuoteRepository;
  parameterSetById(id: string): Promise<ParameterSetSummary | null>;
  /** El conjunto vigente ahora, para poder mostrar en cuánto quedó el precio. */
  activeParameterSet(on: Date): Promise<ParameterSetSummary | null>;
  /** Traduce cada línea a los dos idiomas. La inyecta la capa de presentación. */
  label: LineLabeller;
  now(): Date;
}

/** Las líneas de subtotal (FOB, CIF) no son costos: no entran en las sumas. */
function toLineItemDraft(item: LineItem, index: number): QuoteLineItemDraft {
  return {
    stageCode: item.code,
    kind: item.isSubtotal ? "OTHER" : lineItemKindFor(item.code),
    block: item.block,
    // Las etiquetas definitivas las pone `buildSnapshot`; estas columnas son
    // para listar y filtrar en el back-office, y se rellenan desde el mismo
    // origen para que no puedan divergir.
    labelEs: item.code,
    labelEn: item.code,
    noteEs: null,
    noteEn: null,
    currency: "COP",
    amountUsd: item.amountUsd ? item.amountUsd.toNumber() : null,
    amountCop: item.amountCop.toNumber(),
    appliedRuleId: item.appliedRuleId ?? null,
    appliedRuleKind: null,
    legalBasis: item.legalBasis ?? null,
    baseKind: item.baseKind ?? null,
    baseAmountCop: item.baseAmountCop ? item.baseAmountCop.toNumber() : null,
    rateApplied: item.rateApplied ?? null,
    resolutionStatus: item.status,
    warning: item.warning ?? null,
    sortOrder: item.displayOrder * 10 + index,
  };
}

export async function saveQuote(
  deps: SaveQuoteDeps,
  request: SaveQuoteRequest,
): Promise<SaveQuoteResult> {
  const now = deps.now();

  const parameterSet = await deps.parameterSetById(request.parameterSetId);
  if (!parameterSet) {
    return {
      ok: false,
      reason: "PARAMETER_SET_GONE",
      message: `El conjunto de parámetros ${request.parameterSetId} ya no existe.`,
    };
  }

  // Un conjunto que dejó de estar activo ya no puede emitir: sus tarifas fueron
  // reemplazadas justamente porque alguien las consideró incorrectas.
  if (parameterSet.status !== "ACTIVE" || parameterSet.version !== request.parameterSetVersion) {
    const active = await recomputeTotal(deps, request);
    return {
      ok: false,
      reason: "PARAMETERS_CHANGED",
      expectedTotalCopMinor: request.expectedTotalCopMinor,
      actualTotalCopMinor: active ?? request.expectedTotalCopMinor,
    };
  }

  let input: LiquidationInput;
  try {
    input = await assembleInput(deps.repos, parameterSet, {
      ...request.simulation,
      on: now,
    });
  } catch (error) {
    return { ok: false, reason: "NOT_QUOTABLE", message: (error as Error).message };
  }

  const result = liquidate(input);

  // La comprobación que impide emitir un precio que el cliente no vio.
  const actual = result.totalCop.toJSON().minor;
  if (actual !== request.expectedTotalCopMinor) {
    return {
      ok: false,
      reason: "PARAMETERS_CHANGED",
      expectedTotalCopMinor: request.expectedTotalCopMinor,
      actualTotalCopMinor: actual,
    };
  }

  const vehicle = await deps.repos.vehicles.byId(request.simulation.vehicleId);
  const containerShare = input.consolidation.units.length;

  const snapshot = buildSnapshot({
    input,
    result,
    parameterSet: { id: parameterSet.id, version: parameterSet.version },
    issuedAt: now,
    label: deps.label,
    vehicle: {
      id: vehicle?.id ?? null,
      description: vehicle?.label ?? input.vehicle.hsCode,
      hsCode: input.vehicle.hsCode,
      powertrain: input.vehicle.powertrain,
      originCountry: input.vehicle.originCountry,
      modelYear: input.vehicle.modelYear,
      containerShare,
      rangeKm: vehicle?.rangeKm ?? null,
      rangeStandard: vehicle?.rangeStandard ?? null,
      horsepowerHp: vehicle?.horsepowerHp ?? null,
      seats: vehicle?.seats ?? null,
    },
  });

  // Falla ANTES de escribir: una cotización descuadrada, una vez enviada, ya no
  // se puede corregir.
  assertSnapshotBalances(snapshot);

  const validity = quoteValidity(input, now);

  const draft: QuoteDraft = {
    parameterSetId: parameterSet.id,
    locale: request.locale,
    customerId: request.customerId,
    createdById: request.createdById,
    trmCommercial: input.fx.trmCommercial,
    trmFiscal: input.fx.trmFiscal,
    trmDate: new Date(`${input.fx.trmDate}T00:00:00Z`),
    subtotalUsd: result.cifUsd.toNumber(),
    taxesCop: result.taxesCop.toNumber(),
    landedCostCop: result.landedCostCop.toNumber(),
    totalCop: result.totalCop.toNumber(),
    totalCopCeiling: result.totalCopCeiling ? result.totalCopCeiling.toNumber() : null,
    resolutionStatus: result.status,
    estimatedDays: result.timeline.totalDays,
    validUntil: validity.validUntil,
    snapshot,
    snapshotVersion: SNAPSHOT_VERSION,
    vehicles: [
      {
        vehicleId: vehicle?.id ?? null,
        descriptionEs: vehicle?.label ?? input.vehicle.hsCode,
        hsCodeValue: input.vehicle.hsCode,
        powertrain: input.vehicle.powertrain,
        originCountryCode: input.vehicle.originCountry,
        modelYear: input.vehicle.modelYear,
        fobUsd: result.fobUsd.toNumber(),
        cifUsd: result.cifUsd.toNumber(),
        landedCostCop: result.landedCostCop.toNumber(),
        containerShare,
      },
    ],
    lineItems: result.lineItems.map(toLineItemDraft),
  };

  const quote = await deps.quotes.issue(draft, civilYearInBusinessZone(now));
  return { ok: true, quote, bornStale: validity.bornStale };
}

/**
 * Recalcula con el conjunto que está vigente AHORA.
 *
 * Sirve para decirle al usuario en cuánto quedó su cotización tras la
 * republicación, en vez de un «los parámetros cambiaron» que le obliga a
 * empezar de cero.
 */
async function recomputeTotal(
  deps: SaveQuoteDeps,
  request: SaveQuoteRequest,
): Promise<string | null> {
  try {
    const now = deps.now();
    const active = await deps.activeParameterSet(now);
    if (!active) return null;
    const input = await assembleInput(deps.repos, active, { ...request.simulation, on: now });
    return liquidate(input).totalCop.toJSON().minor;
  } catch {
    return null;
  }
}
