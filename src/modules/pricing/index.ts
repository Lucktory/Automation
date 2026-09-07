/**
 * API pública del módulo de liquidación.
 *
 * Es la ÚNICA superficie por la que el resto de la aplicación puede tocar este
 * módulo. Las etapas, el contexto y los internos del dominio no se exportan:
 * eso es lo que permite reescribirlos sin romper a nadie. Los imports profundos
 * están prohibidos por lint.
 */

export { liquidate } from "./application/liquidate";
export { prorate } from "./domain/proration";
export { STAGES } from "./domain/stages";
export { resolveStageOrder, type CostStage } from "./domain/stage";
export {
  NotQuotableError,
  ParameterStaleError,
  PricingError,
  TariffRuleNotFoundError,
} from "./domain/errors";
export type {
  AddOnInput,
  CalcMethod,
  CommercialInput,
  ConsolidationInput,
  ConsolidationUnit,
  CostBlock,
  DataConfidence,
  DestinationCostInput,
  DeterminingSwitches,
  EngineWarning,
  FreightInput,
  FxInput,
  LineItem,
  LiquidationInput,
  LiquidationResult,
  OriginCostsInput,
  Powertrain,
  ProrationMethod,
  ProrationResult,
  ProrationRow,
  ResolutionStatus,
  TariffResolution,
  TaxBaseKind,
  TimelineEstimate,
  TimelineInput,
  TaxableBaseProrationMethod,
  VehicleFiscalProfile,
} from "./domain/types";
