/**
 * API pública del módulo de parámetros.
 * Los imports profundos están prohibidos por lint.
 */

export {
  resolveTariff,
  type TariffQuery,
  type TariffRuleCandidate,
} from "./domain/tariff-resolver";

export type {
  AuditLogPort,
  FxRateRepository,
  FxRateRow,
  ParameterSetRepository,
  ParameterSetStatus,
  ParameterSetSummary,
  TariffRuleDraft,
  TariffRuleRepository,
  TariffRuleRow,
} from "./domain/ports";

export {
  ensureDraft,
  getTariffScreen,
  publishDraft,
  simulateImpact,
  updateTariffRule,
  type ImpactResult,
  type ImpactRow,
  type ParametersDeps,
  type TariffScreenData,
} from "./application/parameters-screen";
