/**
 * API pública del módulo de cotización.
 * Los imports profundos están prohibidos por lint.
 */

export {
  assembleInput,
  FreightRateNotFoundError,
  NoActiveParameterSetError,
  simulate,
  TariffRuleNotFoundError,
  VehicleNotFoundError,
  type SimulationOverrides,
  type SimulationRequest,
  type SimulatorBundle,
} from "./application/simulate";

export type {
  FreightRateRow,
  FxSnapshot,
  MarginRow,
  PortRow,
  QuotingRepositories,
  VehicleForQuote,
} from "./domain/ports";

export {
  saveQuote,
  type SaveQuoteDeps,
  type SaveQuoteRequest,
  type SaveQuoteResult,
} from "./application/save-quote";

export {
  assertSnapshotBalances,
  buildSnapshot,
  SNAPSHOT_VERSION,
  SnapshotImbalanceError,
  type LineLabeller,
  type QuoteSnapshot,
  type SnapshotLineItem,
} from "./domain/snapshot";

export { quoteValidity, type QuoteValidity } from "./domain/validity";

export type {
  IssuedQuote,
  QuoteDraft,
  QuoteLineItemDraft,
  QuoteRepository,
  QuoteVehicleDraft,
} from "./domain/ports";

export { quoteProposalMail, type QuoteMailOptions } from "./domain/quote-mail";
