import type { DataConfidence, Powertrain, TaxBaseKind } from "@/modules/pricing";
import type { TariffRuleCandidate } from "./tariff-resolver";

/**
 * Puertos del módulo de parámetros.
 *
 * Los define el dominio y los implementa `infra/`. La aplicación depende de
 * estas interfaces, nunca de Prisma — por eso los casos de uso se pueden probar
 * con dobles en memoria y sin base de datos.
 */

export type ParameterSetStatus = "DRAFT" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED";

export interface ParameterSetSummary {
  id: string;
  version: number;
  label: string | null;
  status: ParameterSetStatus;
  validFrom: Date;
  validTo: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
  authorName: string | null;
  /** Cuántas reglas cambiaron respecto del conjunto activo. */
  pendingChanges: number;
}

export interface TariffRuleRow extends TariffRuleCandidate {
  parameterSetId: string;
  originCountryName: string | null;
  hsCodeFormatted: string;
  sourceRef: string | null;
}

export interface TariffRuleDraft {
  hsCode: string;
  originCountry: string | null;
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
  staleAfterDays: number;
  validFrom: Date;
  validTo: Date | null;
}

export interface FxRateRow {
  id: string;
  kind: string;
  rate: number;
  validFrom: Date;
  validTo: Date;
  source: string;
  sourceRef: string | null;
  overrideReason: string | null;
  overriddenByName: string | null;
  fetchedAt: Date;
}

export interface ParameterSetRepository {
  active(on: Date): Promise<ParameterSetSummary | null>;
  draft(): Promise<ParameterSetSummary | null>;
  byId(id: string): Promise<ParameterSetSummary | null>;
  list(limit: number): Promise<ParameterSetSummary[]>;
  /** Clona el conjunto activo en un borrador nuevo. */
  createDraftFrom(sourceId: string, authorId: string): Promise<ParameterSetSummary>;
  /** Activa un borrador y jubila el anterior. Atómico. */
  publish(draftId: string, authorId: string): Promise<ParameterSetSummary>;
}

/**
 * Clave natural de una regla. Al clonar un conjunto, las filas reciben ids
 * nuevos; esto es lo que permite encontrar la MISMA regla en otro conjunto.
 */
export interface TariffRuleKey {
  hsCode: string;
  originCountry: string | null;
  powertrain: Powertrain | null;
  validFrom: Date;
}

export interface TariffRuleRepository {
  listBySet(parameterSetId: string, offset: number, limit: number): Promise<TariffRuleRow[]>;
  countBySet(parameterSetId: string): Promise<number>;
  /** Reglas editadas después de clonarse. Es el número de CAMBIOS reales. */
  countChangedInSet(parameterSetId: string): Promise<number>;
  byId(id: string): Promise<TariffRuleRow | null>;
  /** La misma regla —por clave natural— dentro de otro conjunto. */
  findByKey(parameterSetId: string, key: TariffRuleKey): Promise<TariffRuleRow | null>;
  candidatesFor(parameterSetId: string, hsCode: string): Promise<TariffRuleCandidate[]>;
  create(parameterSetId: string, draft: TariffRuleDraft): Promise<TariffRuleRow>;
  update(id: string, patch: Partial<TariffRuleDraft>): Promise<TariffRuleRow>;
  remove(id: string): Promise<void>;
}

export interface FxRateRepository {
  latest(kind: string): Promise<FxRateRow | null>;
  history(limit: number): Promise<FxRateRow[]>;
  /** Override manual. Exige razón, y queda auditado. */
  override(rate: number, on: Date, reason: string, userId: string): Promise<FxRateRow>;
}

export interface AuditLogPort {
  record(entry: {
    actorId: string | null;
    entity: string;
    entityId: string;
    action: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }): Promise<void>;
}
