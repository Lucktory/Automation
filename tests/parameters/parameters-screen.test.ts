import { beforeEach, describe, expect, it } from "vitest";
import {
  ensureDraft,
  getTariffScreen,
  publishDraft,
  simulateImpact,
  updateTariffRule,
  type ParametersDeps,
  type ParameterSetSummary,
  type TariffRuleDraft,
  type TariffRuleRow,
} from "@/modules/parameters";
import { IMPACT_SAMPLE } from "@/config/impact-sample";
import type { TariffResolution } from "@/modules/pricing";

/**
 * Casos de uso de /admin/parametros, probados SIN base de datos.
 *
 * Esto es el pago de la arquitectura hexagonal: la aplicación depende de
 * puertos, así que aquí se inyectan dobles en memoria y la suite corre en
 * milisegundos. Si estos casos de uso importaran Prisma, esta prueba
 * necesitaría un Postgres.
 */

const ACTIVE_ID = "set-active";
const DRAFT_ID = "set-draft";

function makeRule(over: Partial<TariffRuleRow> = {}): TariffRuleRow {
  return {
    id: "rule-1",
    parameterSetId: ACTIVE_ID,
    hsCode: "8703231090",
    originCountry: "CN",
    powertrain: null,
    dutyRate: 0.4,
    vatRate: 0.19,
    exciseRate: 0.08,
    dutyBase: "CIF",
    vatBase: "CIF_PLUS_ARANCEL",
    exciseBase: "TOTAL_VALUE_EXCL_IVA",
    exciseThresholdFobUsd: 30_000,
    exciseRateAboveThreshold: 0.16,
    exciseAppliesOnImport: true,
    requiresOriginCertificate: false,
    legalBasis: "Dto 1432 de 2025 art. 1",
    confidence: "VERIFIED",
    verifiedAt: new Date("2026-09-01"),
    staleAfterDays: 90,
    validFrom: new Date("2026-01-10"),
    validTo: null,
    originCountryName: "China",
    hsCodeFormatted: "8703.23.10.90",
    sourceRef: null,
    ...over,
  };
}

function makeSet(over: Partial<ParameterSetSummary> = {}): ParameterSetSummary {
  return {
    id: ACTIVE_ID,
    version: 1,
    label: "inicial",
    status: "ACTIVE",
    validFrom: new Date("2026-09-05"),
    validTo: null,
    publishedAt: new Date("2026-09-05"),
    updatedAt: new Date("2026-09-05"),
    authorName: "Ana",
    pendingChanges: 0,
    ...over,
  };
}

/** El doble marca las filas editadas para poder contar cambios reales. */
type FakeRule = TariffRuleRow & { edited?: boolean };

function makeDeps() {
  const state = {
    sets: [makeSet()] as ParameterSetSummary[],
    rules: [makeRule()] as FakeRule[],
    audit: [] as {
      entity: string;
      action: string;
      entityId: string;
      before?: unknown;
    }[],
  };

  const deps: ParametersDeps = {
    sets: {
      active: async () => state.sets.find((s) => s.status === "ACTIVE") ?? null,
      draft: async () => {
        const set = state.sets.find((s) => s.status === "DRAFT");
        if (!set) return null;
        // Como el adaptador real: `pendingChanges` son CAMBIOS, no reglas.
        set.pendingChanges = state.rules.filter(
          (r) => r.parameterSetId === set.id && r.edited === true,
        ).length;
        return set;
      },
      byId: async (id) => state.sets.find((s) => s.id === id) ?? null,
      list: async (limit) => state.sets.slice(0, limit),
      createDraftFrom: async (sourceId) => {
        const source = state.sets.find((s) => s.id === sourceId)!;
        const draft = makeSet({
          id: DRAFT_ID,
          version: source.version + 1,
          status: "DRAFT",
          publishedAt: null,
        });
        state.sets.push(draft);
        for (const rule of state.rules.filter((r) => r.parameterSetId === sourceId)) {
          state.rules.push({ ...rule, id: `${rule.id}-draft`, parameterSetId: DRAFT_ID });
        }
        return draft;
      },
      publish: async (draftId) => {
        const draft = state.sets.find((s) => s.id === draftId)!;
        // Refleja la guarda del adaptador real: solo se publica un BORRADOR.
        if (draft.status !== "DRAFT") {
          throw new Error(`El conjunto está en estado ${draft.status}.`);
        }
        const now = new Date();
        for (const s of state.sets) {
          if (s.status === "ACTIVE") {
            s.status = "SUPERSEDED";
            s.validTo = now;
          }
        }
        draft.status = "ACTIVE";
        draft.publishedAt = now;
        draft.validTo = null;
        return draft;
      },
    },
    tariffs: {
      listBySet: async (setId, offset, limit) =>
        state.rules.filter((r) => r.parameterSetId === setId).slice(offset, offset + limit),
      countBySet: async (setId) =>
        state.rules.filter((r) => r.parameterSetId === setId).length,
      countChangedInSet: async (setId) =>
        state.rules.filter((r) => r.parameterSetId === setId && r.edited === true).length,
      byId: async (id) => state.rules.find((r) => r.id === id) ?? null,
      findByKey: async (setId, key) =>
        state.rules.find(
          (r) =>
            r.parameterSetId === setId &&
            r.hsCode === key.hsCode &&
            r.originCountry === key.originCountry &&
            r.powertrain === key.powertrain &&
            r.validFrom.getTime() === key.validFrom.getTime(),
        ) ?? null,
      candidatesFor: async (setId, hsCode) =>
        state.rules.filter((r) => r.parameterSetId === setId && r.hsCode === hsCode),
      create: async (setId, draft: TariffRuleDraft) => {
        const row = makeRule({ ...draft, id: `rule-${state.rules.length}`, parameterSetId: setId });
        state.rules.push(row);
        return row;
      },
      update: async (id, patch) => {
        const row = state.rules.find((r) => r.id === id)!;
        // `verifiedAt` NO se toca al editar: cambiar una cifra no es
        // contrastarla contra la fuente.
        Object.assign(row, patch, { edited: true });
        return row;
      },
      remove: async (id) => {
        state.rules = state.rules.filter((r) => r.id !== id);
      },
    },
    fx: {
      latest: async () => ({
        id: "fx-1",
        kind: "TRM_DAILY",
        rate: 3_126.08,
        validFrom: new Date("2026-09-05"),
        validTo: new Date("2026-09-08"),
        source: "DATOS_GOV_CO",
        sourceRef: "32sa-8pi3",
        overrideReason: null,
        overriddenByName: null,
        fetchedAt: new Date("2026-09-05"),
      }),
      history: async () => [],
      override: async () => {
        throw new Error("no usado en esta prueba");
      },
    },
    audit: {
      record: async (entry) => {
        state.audit.push({
          entity: entry.entity,
          action: entry.action,
          entityId: entry.entityId,
          before: entry.before,
        });
      },
    },
  };

  return { deps, state };
}

const PLACEHOLDER: TariffResolution = {
  ruleId: "x",
  dutyRate: 0,
  vatRate: 0,
  exciseRate: 0,
  dutyBase: "CIF",
  vatBase: "CIF_PLUS_ARANCEL",
  exciseBase: "TOTAL_VALUE_EXCL_IVA",
  exciseThresholdFobUsd: null,
  exciseRateAboveThreshold: null,
  exciseAppliesOnImport: false,
  requiresOriginCertificate: false,
  legalBasis: "x",
  confidence: "VERIFIED",
  status: "VALOR",
};

describe("pantalla de parámetros", () => {
  let ctx: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    ctx = makeDeps();
  });

  it("muestra el conjunto activo cuando no hay borrador", async () => {
    const screen = await getTariffScreen(ctx.deps, { page: 1, pageSize: 25 });
    expect(screen.draftSet).toBeNull();
    expect(screen.editingSet?.id).toBe(ACTIVE_ID);
    expect(screen.rules).toHaveLength(1);
    expect(screen.latestFx?.rate).toBe(3_126.08);
  });

  it("edita el BORRADOR en cuanto existe, no el activo", async () => {
    await ensureDraft(ctx.deps, "user-1");
    const screen = await getTariffScreen(ctx.deps, { page: 1, pageSize: 25 });
    expect(screen.editingSet?.id).toBe(DRAFT_ID);
    expect(screen.activeSet?.id).toBe(ACTIVE_ID);
  });
});

describe("borradores y publicación", () => {
  let ctx: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    ctx = makeDeps();
  });

  it("clona el activo al crear el primer borrador", async () => {
    const draft = await ensureDraft(ctx.deps, "user-1");
    expect(draft.status).toBe("DRAFT");
    expect(draft.version).toBe(2);
    expect(ctx.state.rules.filter((r) => r.parameterSetId === DRAFT_ID)).toHaveLength(1);
  });

  it("no crea un segundo borrador si ya hay uno", async () => {
    const first = await ensureDraft(ctx.deps, "user-1");
    const second = await ensureDraft(ctx.deps, "user-1");
    expect(second.id).toBe(first.id);
    expect(ctx.state.sets.filter((s) => s.status === "DRAFT")).toHaveLength(1);
  });

  it("deja rastro de auditoría al crear el borrador", async () => {
    await ensureDraft(ctx.deps, "user-1");
    expect(ctx.state.audit).toContainEqual({
      entity: "PricingParameterSet",
      action: "CREATE_DRAFT",
      entityId: DRAFT_ID,
    });
  });

  it("audita toda edición de tarifa", async () => {
    await ensureDraft(ctx.deps, "user-1");
    await updateTariffRule(ctx.deps, {
      ruleId: "rule-1-draft",
      patch: { dutyRate: 0.35 },
      authorId: "user-1",
      reason: "Corrección tras consulta a la SIA",
    });
    expect(ctx.state.audit.some((a) => a.entity === "TariffRule" && a.action === "UPDATE")).toBe(true);
  });

  it("al publicar, el borrador queda activo y el anterior jubilado", async () => {
    const draft = await ensureDraft(ctx.deps, "user-1");
    await publishDraft(ctx.deps, { draftId: draft.id, authorId: "user-1" });

    expect(ctx.state.sets.find((s) => s.id === DRAFT_ID)?.status).toBe("ACTIVE");
    expect(ctx.state.sets.find((s) => s.id === ACTIVE_ID)?.status).toBe("SUPERSEDED");
    expect(ctx.state.audit.some((a) => a.action === "PUBLISH")).toBe(true);
  });
});

describe("simular impacto", () => {
  it("cambiar una tarifa en el borrador mueve el precio del ejemplo", async () => {
    const ctx = makeDeps();
    const draft = await ensureDraft(ctx.deps, "user-1");

    await updateTariffRule(ctx.deps, {
      ruleId: "rule-1-draft",
      patch: { dutyRate: 0.5 },
      authorId: "user-1",
    });

    const impact = await simulateImpact(ctx.deps, {
      activeSetId: ACTIVE_ID,
      draftSetId: draft.id,
      sample: { ...IMPACT_SAMPLE, tariff: PLACEHOLDER },
      on: new Date("2026-09-05"),
    });

    // Subir el arancel del 40 % al 50 % tiene que subir el total.
    expect(impact.totalAfterCop).toBeGreaterThan(impact.totalBeforeCop);
    expect(impact.totalDeltaPct).not.toBeNull();
    expect(impact.totalDeltaPct!).toBeGreaterThan(0);

    const duty = impact.rows.find((r) => r.code === "TAX.ARANCEL");
    expect(duty?.deltaCop).toBeGreaterThan(0);
  });

  it("sin cambios, el impacto es cero", async () => {
    const ctx = makeDeps();
    const draft = await ensureDraft(ctx.deps, "user-1");

    const impact = await simulateImpact(ctx.deps, {
      activeSetId: ACTIVE_ID,
      draftSetId: draft.id,
      sample: { ...IMPACT_SAMPLE, tariff: PLACEHOLDER },
      on: new Date("2026-09-05"),
    });

    expect(impact.totalAfterCop).toBe(impact.totalBeforeCop);
    expect(impact.rows.every((r) => r.deltaCop === 0)).toBe(true);
  });
});

/**
 * Regresiones de la revisión adversarial de M3.
 *
 * La revisión se cayó a medias por errores de autenticación, pero los dos
 * revisores que sí terminaron coincidieron en el peor defecto, y lo confirmé
 * leyendo el código. Cada arreglo tiene aquí su prueba.
 */
describe("[CRÍTICO] editar nunca toca el conjunto ACTIVO", () => {
  it("sin borrador previo, la edición cae en el borrador recién creado", async () => {
    const ctx = makeDeps();

    // El id viene del formulario, que se renderizó con las filas del ACTIVO.
    await updateTariffRule(ctx.deps, {
      ruleId: "rule-1",
      patch: { dutyRate: 0.5 },
      authorId: "user-1",
    });

    const activeRule = ctx.state.rules.find(
      (r) => r.id === "rule-1" && r.parameterSetId === ACTIVE_ID,
    );
    const draftRule = ctx.state.rules.find((r) => r.parameterSetId === DRAFT_ID);

    // El activo queda intacto; el cambio está en el borrador.
    expect(activeRule?.dutyRate).toBe(0.4);
    expect(draftRule?.dutyRate).toBe(0.5);
  });

  it("con borrador existente, edita el borrador directamente", async () => {
    const ctx = makeDeps();
    await ensureDraft(ctx.deps, "user-1");

    await updateTariffRule(ctx.deps, {
      ruleId: "rule-1-draft",
      patch: { dutyRate: 0.45 },
      authorId: "user-1",
    });

    expect(ctx.state.rules.find((r) => r.id === "rule-1")?.dutyRate).toBe(0.4);
    expect(ctx.state.rules.find((r) => r.id === "rule-1-draft")?.dutyRate).toBe(0.45);
  });

  it("no crea un borrador nuevo por cada edición", async () => {
    const ctx = makeDeps();
    await updateTariffRule(ctx.deps, {
      ruleId: "rule-1",
      patch: { dutyRate: 0.5 },
      authorId: "user-1",
    });
    await updateTariffRule(ctx.deps, {
      ruleId: "rule-1",
      patch: { vatRate: 0.19 },
      authorId: "user-1",
    });
    expect(ctx.state.sets.filter((s) => s.status === "DRAFT")).toHaveLength(1);
  });
});

describe("[ALTO] la auditoría permite reconstruir el pasado", () => {
  it("guarda el valor ANTERIOR, no solo el nuevo", async () => {
    const ctx = makeDeps();
    await updateTariffRule(ctx.deps, {
      ruleId: "rule-1",
      patch: { dutyRate: 0.5 },
      authorId: "user-1",
    });

    const entry = ctx.state.audit.find(
      (a) => a.entity === "TariffRule" && a.action === "UPDATE",
    );
    expect(entry?.before).toMatchObject({ dutyRate: 0.4 });
  });
});

describe("[ALTO] publicar dos veces no deja el sistema sin conjunto activo", () => {
  it("la segunda publicación del mismo borrador falla", async () => {
    const ctx = makeDeps();
    const draft = await ensureDraft(ctx.deps, "user-1");
    await publishDraft(ctx.deps, { draftId: draft.id, authorId: "user-1" });

    await expect(
      publishDraft(ctx.deps, { draftId: draft.id, authorId: "user-1" }),
    ).rejects.toThrow();
  });

  it("tras publicar sigue habiendo exactamente un conjunto activo y sin vencer", async () => {
    const ctx = makeDeps();
    const draft = await ensureDraft(ctx.deps, "user-1");
    await publishDraft(ctx.deps, { draftId: draft.id, authorId: "user-1" });

    const active = ctx.state.sets.filter((s) => s.status === "ACTIVE");
    expect(active).toHaveLength(1);
    expect(active[0]!.validTo).toBeNull();
  });
});

describe("[MEDIO] editar no es verificar", () => {
  it("cambiar una tarifa no marca la regla como reverificada", async () => {
    const ctx = makeDeps();
    const before = ctx.state.rules[0]!.verifiedAt;

    await updateTariffRule(ctx.deps, {
      ruleId: "rule-1",
      patch: { dutyRate: 0.5 },
      authorId: "user-1",
    });

    const draftRule = ctx.state.rules.find((r) => r.parameterSetId === DRAFT_ID);
    expect(draftRule?.verifiedAt).toEqual(before);
  });
});

describe("[MEDIO] el banner cuenta cambios, no reglas", () => {
  it("un borrador recién clonado no tiene cambios pendientes", async () => {
    const ctx = makeDeps();
    await ensureDraft(ctx.deps, "user-1");
    const screen = await getTariffScreen(ctx.deps, { page: 1, pageSize: 25 });
    expect(screen.draftSet?.pendingChanges).toBe(0);
  });

  it("cuenta una sola regla editada aunque el conjunto tenga muchas", async () => {
    const ctx = makeDeps();
    await updateTariffRule(ctx.deps, {
      ruleId: "rule-1",
      patch: { dutyRate: 0.5 },
      authorId: "user-1",
    });
    const changed = await ctx.deps.tariffs.countChangedInSet(DRAFT_ID);
    expect(changed).toBe(1);
  });
});
