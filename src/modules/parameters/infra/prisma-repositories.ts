import type { Prisma, PrismaClient } from "@prisma/client";
import type { DataConfidence, Powertrain, TaxBaseKind } from "@/modules/pricing";
import type {
  AuditLogPort,
  FxRateRepository,
  FxRateRow,
  ParameterSetRepository,
  ParameterSetSummary,
  ParameterSetStatus,
  TariffRuleDraft,
  TariffRuleKey,
  TariffRuleRepository,
  TariffRuleRow,
} from "../domain/ports";
import type { TariffRuleCandidate } from "../domain/tariff-resolver";

/**
 * Adaptadores Prisma de los puertos del módulo.
 *
 * Aquí, y solo aquí, se traduce entre el esquema y el dominio: los `Decimal` de
 * Prisma pasan a `number`, y los enums de la base a los tipos propios. El
 * dominio no importa Prisma — está prohibido por lint — precisamente para que
 * esta traducción tenga un único sitio.
 */

const toNumber = (value: Prisma.Decimal | null): number =>
  value === null ? 0 : Number(value);

const toNullableNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

export class PrismaParameterSetRepository implements ParameterSetRepository {
  constructor(private readonly db: PrismaClient) {}

  private static toSummary(row: {
    id: string;
    version: number;
    label: string | null;
    status: string;
    validFrom: Date;
    validTo: Date | null;
    publishedAt: Date | null;
    updatedAt: Date;
    author?: { name: string | null } | null;
  }, changedRules = 0): ParameterSetSummary {
    return {
      id: row.id,
      version: row.version,
      label: row.label,
      status: row.status as ParameterSetStatus,
      validFrom: row.validFrom,
      validTo: row.validTo,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      authorName: row.author?.name ?? null,
      pendingChanges: changedRules,
    };
  }

  private readonly include = { author: { select: { name: true } } } as const;

  /**
   * Reglas EDITADAS desde que el conjunto se clonó.
   *
   * Al clonar, `createdAt` y `updatedAt` nacen iguales; solo una edición los
   * separa. El banner decía "N cambios sin publicar" mostrando el TOTAL de
   * reglas del conjunto — con 94 reglas sembradas, simplemente falso.
   */
  private async countChanged(parameterSetId: string): Promise<number> {
    const rows = await this.db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "tariff_rules"
      WHERE "parameterSetId" = ${parameterSetId}
        AND "updatedAt" > "createdAt"
    `;
    return rows[0]?.count ?? 0;
  }

  async active(on: Date): Promise<ParameterSetSummary | null> {
    const row = await this.db.pricingParameterSet.findFirst({
      where: {
        status: "ACTIVE",
        validFrom: { lte: on },
        OR: [{ validTo: null }, { validTo: { gte: on } }],
      },
      orderBy: { version: "desc" },
      include: this.include,
    });
    return row ? PrismaParameterSetRepository.toSummary(row) : null;
  }

  async draft(): Promise<ParameterSetSummary | null> {
    const row = await this.db.pricingParameterSet.findFirst({
      where: { status: "DRAFT" },
      orderBy: { version: "desc" },
      include: this.include,
    });
    if (!row) return null;
    return PrismaParameterSetRepository.toSummary(row, await this.countChanged(row.id));
  }

  async byId(id: string): Promise<ParameterSetSummary | null> {
    const row = await this.db.pricingParameterSet.findUnique({
      where: { id },
      include: this.include,
    });
    return row ? PrismaParameterSetRepository.toSummary(row) : null;
  }

  async list(limit: number): Promise<ParameterSetSummary[]> {
    const rows = await this.db.pricingParameterSet.findMany({
      orderBy: { version: "desc" },
      take: limit,
      include: this.include,
    });
    return rows.map(PrismaParameterSetRepository.toSummary);
  }

  /**
   * Clona el conjunto de origen en un borrador nuevo, con todas sus reglas.
   * En una transacción: un borrador a medio copiar produciría cotizaciones con
   * reglas faltantes, que es la peor clase de error de este sistema.
   */
  async createDraftFrom(sourceId: string, authorId: string): Promise<ParameterSetSummary> {
    return this.db.$transaction(async (tx) => {
      const source = await tx.pricingParameterSet.findUniqueOrThrow({
        where: { id: sourceId },
        include: {
          tariffRules: true,
          freightRates: true,
          destinationCostRules: true,
          addOnProducts: true,
          margins: true,
        },
      });

      const max = await tx.pricingParameterSet.aggregate({ _max: { version: true } });
      const version = (max._max.version ?? 0) + 1;

      const draft = await tx.pricingParameterSet.create({
        data: {
          version,
          label: `Borrador desde v${source.version}`,
          status: "DRAFT",
          validFrom: new Date(),
          authorId,
        },
      });

      /** Copia las filas al borrador nuevo, descartando id y set de origen. */
      const strip = <T extends { id: string; parameterSetId: string }>(rows: T[]) =>
        rows.map((row) => {
          const copy: Partial<T> = { ...row };
          delete copy.id;
          delete copy.parameterSetId;
          return { ...copy, parameterSetId: draft.id };
        });

      await tx.tariffRule.createMany({ data: strip(source.tariffRules) as never });
      await tx.freightRate.createMany({ data: strip(source.freightRates) as never });
      await tx.destinationCostRule.createMany({
        data: strip(source.destinationCostRules) as never,
      });
      await tx.addOnProduct.createMany({ data: strip(source.addOnProducts) as never });
      await tx.marginRule.createMany({ data: strip(source.margins) as never });

      const created = await tx.pricingParameterSet.findUniqueOrThrow({
        where: { id: draft.id },
        include: this.include,
      });
      return PrismaParameterSetRepository.toSummary(created);
    });
  }

  /** Activa un borrador y jubila el activo anterior. Atómico. */
  async publish(draftId: string, authorId: string): Promise<ParameterSetSummary> {
    return this.db.$transaction(async (tx) => {
      const now = new Date();

      // Solo se publica un BORRADOR. Publicar dos veces el mismo id lo jubilaba
      // y lo reactivaba dejando `validTo` en el pasado, y `active()` exige
      // `validTo >= hoy`: el sistema se quedaba SIN conjunto activo.
      const draft = await tx.pricingParameterSet.findUniqueOrThrow({
        where: { id: draftId },
        select: { status: true, version: true },
      });
      if (draft.status !== "DRAFT") {
        throw new Error(
          `El conjunto v${draft.version} está en estado ${draft.status}; solo se publica un BORRADOR.`,
        );
      }

      await tx.pricingParameterSet.updateMany({
        where: { status: "ACTIVE" },
        data: { status: "SUPERSEDED", validTo: now },
      });

      await tx.pricingParameterSet.update({
        where: { id: draftId },
        // `validTo: null` es imprescindible: sin él el conjunto nace vencido.
        data: {
          status: "ACTIVE",
          publishedAt: now,
          validFrom: now,
          validTo: null,
          authorId,
        },
      });

      const row = await tx.pricingParameterSet.findUniqueOrThrow({
        where: { id: draftId },
        include: this.include,
      });
      return PrismaParameterSetRepository.toSummary(row);
    });
  }
}

export class PrismaTariffRuleRepository implements TariffRuleRepository {
  constructor(private readonly db: PrismaClient) {}

  private static toCandidate(row: {
    id: string;
    hsCodeValue: string;
    originCountryCode: string | null;
    powertrain: string | null;
    dutyRate: Prisma.Decimal;
    vatRate: Prisma.Decimal;
    exciseRate: Prisma.Decimal;
    dutyBase: string;
    vatBase: string;
    exciseBase: string;
    exciseThresholdFobUsd: Prisma.Decimal | null;
    exciseRateAboveThreshold: Prisma.Decimal | null;
    exciseAppliesOnImport: boolean;
    requiresOriginCertificate: boolean;
    legalBasis: string;
    confidence: string;
    verifiedAt: Date | null;
    staleAfterDays: number;
    validFrom: Date;
    validTo: Date | null;
  }): TariffRuleCandidate {
    return {
      id: row.id,
      hsCode: row.hsCodeValue,
      originCountry: row.originCountryCode,
      powertrain: row.powertrain as Powertrain | null,
      dutyRate: toNumber(row.dutyRate),
      vatRate: toNumber(row.vatRate),
      exciseRate: toNumber(row.exciseRate),
      dutyBase: row.dutyBase as TaxBaseKind,
      vatBase: row.vatBase as TaxBaseKind,
      exciseBase: row.exciseBase as TaxBaseKind,
      exciseThresholdFobUsd: toNullableNumber(row.exciseThresholdFobUsd),
      exciseRateAboveThreshold: toNullableNumber(row.exciseRateAboveThreshold),
      exciseAppliesOnImport: row.exciseAppliesOnImport,
      requiresOriginCertificate: row.requiresOriginCertificate,
      legalBasis: row.legalBasis,
      confidence: row.confidence as DataConfidence,
      verifiedAt: row.verifiedAt,
      staleAfterDays: row.staleAfterDays,
      validFrom: row.validFrom,
      validTo: row.validTo,
    };
  }

  /** Fila enriquecida para la tabla del admin. Un solo sitio de mapeo. */
  private static toRow(
    row: Parameters<typeof PrismaTariffRuleRepository.toCandidate>[0] & {
      parameterSetId: string;
      originCountry?: { nameEs: string } | null;
      hsCode: { formatted: string };
    },
  ): TariffRuleRow {
    return {
      ...PrismaTariffRuleRepository.toCandidate(row),
      parameterSetId: row.parameterSetId,
      originCountryName: row.originCountry?.nameEs ?? null,
      hsCodeFormatted: row.hsCode.formatted,
      sourceRef: null,
    };
  }

  async listBySet(
    parameterSetId: string,
    offset: number,
    limit: number,
  ): Promise<TariffRuleRow[]> {
    const rows = await this.db.tariffRule.findMany({
      where: { parameterSetId },
      orderBy: [{ hsCodeValue: "asc" }, { originCountryCode: "asc" }],
      skip: offset,
      take: limit,
      include: {
        originCountry: { select: { nameEs: true } },
        hsCode: { select: { formatted: true } },
      },
    });

    return rows.map(PrismaTariffRuleRepository.toRow);
  }

  countBySet(parameterSetId: string): Promise<number> {
    return this.db.tariffRule.count({ where: { parameterSetId } });
  }

  /**
   * Reglas EDITADAS desde que el borrador se clonó.
   *
   * Al clonar, `createdAt` y `updatedAt` nacen iguales; solo una edición separa
   * los dos. Antes el banner mostraba el total de reglas del conjunto y decía
   * "N cambios sin publicar", que con 94 reglas sembradas era simplemente falso.
   */
  async countChangedInSet(parameterSetId: string): Promise<number> {
    const rows = await this.db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "tariff_rules"
      WHERE "parameterSetId" = ${parameterSetId}
        AND "updatedAt" > "createdAt"
    `;
    return rows[0]?.count ?? 0;
  }

  async byId(id: string): Promise<TariffRuleRow | null> {
    const row = await this.db.tariffRule.findUnique({
      where: { id },
      include: {
        originCountry: { select: { nameEs: true } },
        hsCode: { select: { formatted: true } },
      },
    });
    return row ? PrismaTariffRuleRepository.toRow(row) : null;
  }

  /** La misma regla, por clave natural, dentro de otro conjunto. */
  async findByKey(
    parameterSetId: string,
    key: TariffRuleKey,
  ): Promise<TariffRuleRow | null> {
    const row = await this.db.tariffRule.findFirst({
      where: {
        parameterSetId,
        hsCodeValue: key.hsCode,
        originCountryCode: key.originCountry,
        powertrain: key.powertrain as never,
        validFrom: key.validFrom,
      },
      include: {
        originCountry: { select: { nameEs: true } },
        hsCode: { select: { formatted: true } },
      },
    });
    return row ? PrismaTariffRuleRepository.toRow(row) : null;
  }

  async candidatesFor(
    parameterSetId: string,
    hsCode: string,
  ): Promise<TariffRuleCandidate[]> {
    const rows = await this.db.tariffRule.findMany({
      where: { parameterSetId, hsCodeValue: hsCode },
    });
    return rows.map(PrismaTariffRuleRepository.toCandidate);
  }

  async create(parameterSetId: string, draft: TariffRuleDraft): Promise<TariffRuleRow> {
    const created = await this.db.tariffRule.create({
      data: {
        parameterSetId,
        hsCodeValue: draft.hsCode,
        originCountryCode: draft.originCountry,
        powertrain: draft.powertrain as never,
        dutyRate: draft.dutyRate,
        vatRate: draft.vatRate,
        exciseRate: draft.exciseRate,
        dutyBase: draft.dutyBase as never,
        vatBase: draft.vatBase as never,
        exciseBase: draft.exciseBase as never,
        exciseThresholdFobUsd: draft.exciseThresholdFobUsd,
        exciseRateAboveThreshold: draft.exciseRateAboveThreshold,
        exciseAppliesOnImport: draft.exciseAppliesOnImport,
        requiresOriginCertificate: draft.requiresOriginCertificate,
        legalBasis: draft.legalBasis,
        confidence: draft.confidence as never,
        staleAfterDays: draft.staleAfterDays,
        validFrom: draft.validFrom,
        validTo: draft.validTo,
      },
      include: {
        originCountry: { select: { nameEs: true } },
        hsCode: { select: { formatted: true } },
      },
    });

    return PrismaTariffRuleRepository.toRow(created);
  }

  async update(id: string, patch: Partial<TariffRuleDraft>): Promise<TariffRuleRow> {
    const updated = await this.db.tariffRule.update({
      where: { id },
      data: {
        ...(patch.dutyRate !== undefined ? { dutyRate: patch.dutyRate } : {}),
        ...(patch.vatRate !== undefined ? { vatRate: patch.vatRate } : {}),
        ...(patch.exciseRate !== undefined ? { exciseRate: patch.exciseRate } : {}),
        ...(patch.legalBasis !== undefined ? { legalBasis: patch.legalBasis } : {}),
        ...(patch.confidence !== undefined ? { confidence: patch.confidence as never } : {}),
        ...(patch.validFrom !== undefined ? { validFrom: patch.validFrom } : {}),
        ...(patch.validTo !== undefined ? { validTo: patch.validTo } : {}),
        // `verifiedAt` NO se toca aquí. Cambiar una cifra no es lo mismo que
        // contrastarla contra la fuente, y marcarla como verificada silenciaba
        // el aviso de frescura y el VALOR_CON_ADVERTENCIA del resolver.
        // Reverificar es una acción propia y explícita.
      },
      include: {
        originCountry: { select: { nameEs: true } },
        hsCode: { select: { formatted: true } },
      },
    });

    return PrismaTariffRuleRepository.toRow(updated);
  }

  async remove(id: string): Promise<void> {
    await this.db.tariffRule.delete({ where: { id } });
  }
}

export class PrismaFxRateRepository implements FxRateRepository {
  constructor(private readonly db: PrismaClient) {}

  private static toRow(row: {
    id: string;
    kind: string;
    rate: Prisma.Decimal;
    validFrom: Date;
    validTo: Date;
    source: string;
    sourceRef: string | null;
    overrideReason: string | null;
    fetchedAt: Date;
    overriddenBy?: { name: string | null } | null;
  }): FxRateRow {
    return {
      id: row.id,
      kind: row.kind,
      rate: toNumber(row.rate),
      validFrom: row.validFrom,
      validTo: row.validTo,
      source: row.source,
      sourceRef: row.sourceRef,
      overrideReason: row.overrideReason,
      overriddenByName: row.overriddenBy?.name ?? null,
      fetchedAt: row.fetchedAt,
    };
  }

  async latest(kind: string): Promise<FxRateRow | null> {
    const row = await this.db.fxRate.findFirst({
      where: { kind: kind as never },
      orderBy: { validFrom: "desc" },
      include: { overriddenBy: { select: { name: true } } },
    });
    return row ? PrismaFxRateRepository.toRow(row) : null;
  }

  async history(limit: number): Promise<FxRateRow[]> {
    const rows = await this.db.fxRate.findMany({
      orderBy: { validFrom: "desc" },
      take: limit,
      include: { overriddenBy: { select: { name: true } } },
    });
    return rows.map(PrismaFxRateRepository.toRow);
  }

  /** Override manual: exige razón y queda atribuido. */
  async override(
    rate: number,
    on: Date,
    reason: string,
    userId: string,
  ): Promise<FxRateRow> {
    const row = await this.db.fxRate.create({
      data: {
        kind: "SPOT_MANUAL",
        rate,
        validFrom: on,
        validTo: on,
        source: "MANUAL",
        overrideReason: reason,
        overriddenById: userId,
      },
      include: { overriddenBy: { select: { name: true } } },
    });
    return PrismaFxRateRepository.toRow(row);
  }
}

export class PrismaAuditLog implements AuditLogPort {
  constructor(private readonly db: PrismaClient) {}

  async record(entry: {
    actorId: string | null;
    entity: string;
    entityId: string;
    action: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }): Promise<void> {
    await this.db.auditLog.create({
      data: {
        actorType: entry.actorId === null ? "SYSTEM" : "USER",
        actorId: entry.actorId,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        before: (entry.before ?? undefined) as never,
        after: (entry.after ?? undefined) as never,
        reason: entry.reason ?? null,
      },
    });
  }
}
