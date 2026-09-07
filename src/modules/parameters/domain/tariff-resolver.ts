import { TariffRuleNotFoundError } from "@/modules/pricing/domain/errors";
import type {
  DataConfidence,
  Powertrain,
  ResolutionStatus,
  TariffResolution,
  TaxBaseKind,
} from "@/modules/pricing/domain/types";

/**
 * Resolución de la regla arancelaria.
 *
 * La precedencia es una FUNCIÓN DE PUNTAJE sobre datos, no una cadena de `if`.
 * Gana la regla más específica: origen exacto le gana a comodín, motorización
 * exacta le gana a comodín, y a igualdad de puntaje gana la vigencia más
 * reciente.
 *
 * Devuelve además QUÉ regla ganó, para que el PDF pueda citar la norma de cada
 * cifra y el operador pueda ver por qué un número salió como salió.
 */

export interface TariffRuleCandidate {
  id: string;
  hsCode: string;
  /** null = comodín (NMF / erga omnes). */
  originCountry: string | null;
  /** null = aplica a cualquier motorización. */
  powertrain: Powertrain | null;
  dutyRate: number;
  vatRate: number;
  exciseRate: number;
  dutyBase: TaxBaseKind;
  vatBase: TaxBaseKind;
  exciseBase: TaxBaseKind;
  exciseThresholdFobUsd: number | null;
  exciseRateAboveThreshold: number | null;
  exciseAppliesOnImport: boolean;
  requiresOriginCertificate: boolean;
  legalBasis: string;
  confidence: DataConfidence;
  verifiedAt: Date | null;
  staleAfterDays: number;
  validFrom: Date;
  validTo: Date | null;
}

export interface TariffQuery {
  /** Subpartida a 10 dígitos exactos. */
  hsCode: string;
  /** País de ORIGEN (fabricación), nunca el de compra. */
  originCountry: string;
  powertrain: Powertrain;
  /** Fecha proyectada de la declaración. */
  on: Date;
}

const SCORE_ORIGIN_EXACT = 4;
const SCORE_POWERTRAIN_EXACT = 2;
const MS_PER_DAY = 86_400_000;
/** Longitud de "YYYY-MM-DD". */
const ISO_DATE_LENGTH = 10;

function score(rule: TariffRuleCandidate, query: TariffQuery): number {
  let total = 0;
  if (rule.originCountry === query.originCountry) total += SCORE_ORIGIN_EXACT;
  if (rule.powertrain === query.powertrain) total += SCORE_POWERTRAIN_EXACT;
  return total;
}

function isApplicable(rule: TariffRuleCandidate, query: TariffQuery): boolean {
  if (rule.hsCode !== query.hsCode) return false;
  if (rule.originCountry !== null && rule.originCountry !== query.originCountry) return false;
  if (rule.powertrain !== null && rule.powertrain !== query.powertrain) return false;
  if (rule.validFrom.getTime() > query.on.getTime()) return false;
  if (rule.validTo !== null && rule.validTo.getTime() < query.on.getTime()) return false;
  return true;
}

function daysSince(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Traduce confianza y frescura a un estado de resolución.
 *
 * Nunca devuelve un valor por defecto en silencio: un dato sin verificar
 * produce NO_COTIZABLE, no una cifra que parece firme.
 */
function statusOf(
  rule: TariffRuleCandidate,
  on: Date,
): { status: ResolutionStatus; warning?: string } {
  if (rule.confidence === "UNVERIFIED") {
    return {
      status: "NO_COTIZABLE",
      warning: `La regla ${rule.id} no está verificada. No se puede cotizar en firme.`,
    };
  }

  if (rule.verifiedAt === null) {
    return {
      status: "VALOR_CON_ADVERTENCIA",
      warning: `La regla ${rule.id} nunca se ha verificado contra la fuente.`,
    };
  }

  const age = daysSince(rule.verifiedAt, on);
  if (age > rule.staleAfterDays) {
    return {
      status: "VALOR_CON_ADVERTENCIA",
      warning: `La regla ${rule.id} no se verifica hace ${age} días (vigencia ${rule.staleAfterDays}).`,
    };
  }

  if (rule.confidence === "ESTIMATED") {
    return {
      status: "VALOR_CON_ADVERTENCIA",
      warning: `La regla ${rule.id} es una estimación, no una tarifa verificada.`,
    };
  }

  return { status: "VALOR" };
}

export function resolveTariff(
  candidates: readonly TariffRuleCandidate[],
  query: TariffQuery,
): TariffResolution {
  const applicable = candidates.filter((rule) => isApplicable(rule, query));

  // La ausencia de regla NO es una exención. Se lanza.
  if (applicable.length === 0) {
    throw new TariffRuleNotFoundError(
      query.hsCode,
      query.originCountry,
      query.powertrain,
      query.on.toISOString().slice(0, ISO_DATE_LENGTH),
    );
  }

  const winner = applicable.reduce((best, rule) => {
    const delta = score(rule, query) - score(best, query);
    if (delta > 0) return rule;
    if (delta < 0) return best;
    // A igual especificidad, gana la vigencia más reciente.
    return rule.validFrom.getTime() > best.validFrom.getTime() ? rule : best;
  });

  const { status, warning } = statusOf(winner, query.on);

  return {
    ruleId: winner.id,
    dutyRate: winner.dutyRate,
    vatRate: winner.vatRate,
    exciseRate: winner.exciseRate,
    dutyBase: winner.dutyBase,
    vatBase: winner.vatBase,
    exciseBase: winner.exciseBase,
    exciseThresholdFobUsd: winner.exciseThresholdFobUsd,
    exciseRateAboveThreshold: winner.exciseRateAboveThreshold,
    exciseAppliesOnImport: winner.exciseAppliesOnImport,
    requiresOriginCertificate: winner.requiresOriginCertificate,
    legalBasis: winner.legalBasis,
    confidence: winner.confidence,
    status,
    ...(warning !== undefined ? { warning } : {}),
  };
}
