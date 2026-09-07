import { liquidate, type LineItem, type LiquidationInput } from "@/modules/pricing";
import type {
  AuditLogPort,
  FxRateRepository,
  FxRateRow,
  ParameterSetRepository,
  ParameterSetSummary,
  TariffRuleDraft,
  TariffRuleRepository,
  TariffRuleRow,
} from "../domain/ports";
import { resolveTariff } from "../domain/tariff-resolver";

/**
 * Casos de uso de la pantalla /admin/parametros.
 *
 * Dependen de PUERTOS, no de Prisma, así que se prueban con dobles en memoria y
 * sin base de datos. El composition root es el único sitio que sabe qué
 * adaptador concreto se inyecta.
 */

export interface ParametersDeps {
  sets: ParameterSetRepository;
  tariffs: TariffRuleRepository;
  fx: FxRateRepository;
  audit: AuditLogPort;
}

export interface TariffScreenData {
  activeSet: ParameterSetSummary | null;
  draftSet: ParameterSetSummary | null;
  /** El conjunto que se está mostrando: el borrador si existe, si no el activo. */
  editingSet: ParameterSetSummary | null;
  rules: TariffRuleRow[];
  totalRules: number;
  page: number;
  pageSize: number;
  latestFx: FxRateRow | null;
}

export async function getTariffScreen(
  deps: ParametersDeps,
  options: { page: number; pageSize: number; now?: Date },
): Promise<TariffScreenData> {
  const now = options.now ?? new Date();
  const [activeSet, draftSet, latestFx] = await Promise.all([
    deps.sets.active(now),
    deps.sets.draft(),
    deps.fx.latest("TRM_DAILY"),
  ]);

  // Se edita el borrador si existe; si no, se muestra el activo en lectura.
  const editingSet = draftSet ?? activeSet;
  if (!editingSet) {
    return {
      activeSet,
      draftSet,
      editingSet: null,
      rules: [],
      totalRules: 0,
      page: options.page,
      pageSize: options.pageSize,
      latestFx,
    };
  }

  const offset = (options.page - 1) * options.pageSize;
  const [rules, totalRules] = await Promise.all([
    deps.tariffs.listBySet(editingSet.id, offset, options.pageSize),
    deps.tariffs.countBySet(editingSet.id),
  ]);

  return {
    activeSet,
    draftSet,
    editingSet,
    rules,
    totalRules,
    page: options.page,
    pageSize: options.pageSize,
    latestFx,
  };
}

// ---------------------------------------------------------------------------
// Simular impacto
// ---------------------------------------------------------------------------

export interface ImpactRow {
  code: string;
  beforeCop: number;
  afterCop: number;
  deltaCop: number;
  deltaPct: number | null;
}

export interface ImpactResult {
  rows: ImpactRow[];
  totalBeforeCop: number;
  totalAfterCop: number;
  totalDeltaPct: number | null;
  /** El estado peor de los dos escenarios. */
  blocked: boolean;
}

/**
 * Corre el motor dos veces sobre el mismo vehículo de ejemplo: una con las
 * reglas del conjunto activo y otra con las del borrador. La diferencia es
 * exactamente lo que el operador vería en el precio si publicara.
 *
 * Es la función que convierte una pantalla de tarifas en una sala de control:
 * cambiar un número deja de ser un acto de fe.
 */
export async function simulateImpact(
  deps: ParametersDeps,
  options: {
    activeSetId: string;
    draftSetId: string;
    sample: LiquidationInput;
    on?: Date;
  },
): Promise<ImpactResult> {
  const on = options.on ?? new Date();
  const query = {
    hsCode: options.sample.vehicle.hsCode,
    originCountry: options.sample.vehicle.originCountry,
    powertrain: options.sample.vehicle.powertrain,
    on,
  };

  const [activeCandidates, draftCandidates] = await Promise.all([
    deps.tariffs.candidatesFor(options.activeSetId, query.hsCode),
    deps.tariffs.candidatesFor(options.draftSetId, query.hsCode),
  ]);

  const run = (candidates: Awaited<ReturnType<typeof deps.tariffs.candidatesFor>>) =>
    liquidate({ ...options.sample, tariff: resolveTariff(candidates, query) });

  const before = run(activeCandidates);
  const after = run(draftCandidates);

  const codes = [
    ...new Set([
      ...before.lineItems.filter((l) => !l.isSubtotal).map((l) => l.code),
      ...after.lineItems.filter((l) => !l.isSubtotal).map((l) => l.code),
    ]),
  ];

  const amount = (items: LineItem[], code: string) =>
    items.find((l) => l.code === code)?.amountCop.toNumber() ?? 0;

  const rows: ImpactRow[] = codes.map((code) => {
    const beforeCop = amount(before.lineItems, code);
    const afterCop = amount(after.lineItems, code);
    const deltaCop = afterCop - beforeCop;
    return {
      code,
      beforeCop,
      afterCop,
      deltaCop,
      deltaPct: beforeCop === 0 ? null : (deltaCop / beforeCop) * 100,
    };
  });

  const totalBeforeCop = before.totalCop.toNumber();
  const totalAfterCop = after.totalCop.toNumber();

  return {
    rows,
    totalBeforeCop,
    totalAfterCop,
    totalDeltaPct:
      totalBeforeCop === 0
        ? null
        : ((totalAfterCop - totalBeforeCop) / totalBeforeCop) * 100,
    blocked: before.status === "NO_COTIZABLE" || after.status === "NO_COTIZABLE",
  };
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

/**
 * Toda escritura de parámetros pasa por aquí, y toda escritura queda auditada.
 * Nunca se edita el conjunto ACTIVO: si no hay borrador, se crea uno. Editar en
 * caliente cambiaría el precio de las cotizaciones en vuelo.
 */
export async function ensureDraft(
  deps: ParametersDeps,
  authorId: string,
): Promise<ParameterSetSummary> {
  const existing = await deps.sets.draft();
  if (existing) return existing;

  const active = await deps.sets.active(new Date());
  if (!active) {
    throw new Error("No hay conjunto de parámetros activo del que partir.");
  }

  const draft = await deps.sets.createDraftFrom(active.id, authorId);
  await deps.audit.record({
    actorId: authorId,
    entity: "PricingParameterSet",
    entityId: draft.id,
    action: "CREATE_DRAFT",
    after: { version: draft.version, from: active.version },
  });
  return draft;
}

/**
 * Edita una regla arancelaria, garantizando que el cambio cae en el BORRADOR.
 *
 * El `ruleId` que llega del formulario apunta a la fila que se estaba MOSTRANDO,
 * y esa fila pertenece al conjunto ACTIVO cuando todavía no había borrador.
 * Clonar y luego actualizar por ese id escribía en el activo — justo lo que la
 * regla del producto prohíbe. Por eso, tras asegurar el borrador, se resuelve la
 * MISMA regla dentro de él por su clave natural.
 */
export async function updateTariffRule(
  deps: ParametersDeps,
  options: {
    ruleId: string;
    patch: Partial<TariffRuleDraft>;
    authorId: string;
    reason?: string;
  },
): Promise<TariffRuleRow> {
  const original = await deps.tariffs.byId(options.ruleId);
  if (!original) {
    throw new Error(`No existe la regla arancelaria ${options.ruleId}.`);
  }

  const draft = await ensureDraft(deps, options.authorId);

  const target =
    original.parameterSetId === draft.id
      ? original
      : await deps.tariffs.findByKey(draft.id, {
          hsCode: original.hsCode,
          originCountry: original.originCountry,
          powertrain: original.powertrain,
          validFrom: original.validFrom,
        });

  if (!target) {
    throw new Error(
      `La regla ${options.ruleId} no tiene equivalente en el borrador v${draft.version}.`,
    );
  }

  // Se guarda el estado ANTERIOR: una auditoría que solo dice el valor nuevo no
  // permite reconstruir por qué una cotización de hace un mes salió como salió.
  const before = {
    dutyRate: target.dutyRate,
    vatRate: target.vatRate,
    exciseRate: target.exciseRate,
    legalBasis: target.legalBasis,
    confidence: target.confidence,
  };

  const updated = await deps.tariffs.update(target.id, options.patch);

  await deps.audit.record({
    actorId: options.authorId,
    entity: "TariffRule",
    entityId: target.id,
    action: "UPDATE",
    before,
    after: options.patch,
    ...(options.reason !== undefined ? { reason: options.reason } : {}),
  });

  return updated;
}

export async function publishDraft(
  deps: ParametersDeps,
  options: { draftId: string; authorId: string },
): Promise<ParameterSetSummary> {
  const published = await deps.sets.publish(options.draftId, options.authorId);
  await deps.audit.record({
    actorId: options.authorId,
    entity: "PricingParameterSet",
    entityId: options.draftId,
    action: "PUBLISH",
    after: { version: published.version },
  });
  return published;
}
