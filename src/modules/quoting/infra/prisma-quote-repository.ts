import type { Prisma, PrismaClient } from "@prisma/client";
import type { IssuedQuote, QuoteDraft, QuoteRepository } from "../domain/ports";

/**
 * Emisión de cotizaciones contra Prisma.
 *
 * Dos cosas ocurren aquí y en ningún otro sitio:
 *
 * 1. **El consecutivo se asigna con un bloqueo de fila**, no leyendo el máximo.
 *    `UPDATE quote_counters SET next = next + 1 ... RETURNING next` bloquea la
 *    fila del año durante la transacción, así que dos guardados simultáneos se
 *    serializan: el segundo espera al primero y recibe el número siguiente. Leer
 *    `max(sequence) + 1` no sirve — bajo READ COMMITTED ambos leen el mismo
 *    máximo, ambos escriben el mismo número, y el segundo revienta con un 23505
 *    que tira abajo su transacción entera.
 *
 * 2. **Todo se escribe junto.** Cabecera, vehículos, líneas y consecutivo en una
 *    sola transacción. Si algo falla, no queda una cotización con número
 *    reservado y sin instantánea que reimprimir.
 */

/** El formato del número. Vive aquí porque se deriva de columnas, no se inventa. */
const SEQUENCE_PAD = 4;

export function quoteReference(issueYear: number, sequence: number): string {
  return `COT-${issueYear}-${String(sequence).padStart(SEQUENCE_PAD, "0")}`;
}

export function createQuoteRepository(db: PrismaClient): QuoteRepository {
  return {
    issue: async (draft: QuoteDraft, issueYear: number): Promise<IssuedQuote> =>
      db.$transaction(async (tx) => {
        // Reserva atómica del consecutivo del año. El INSERT ... ON CONFLICT
        // cubre el primer guardado del año sin una migración anual.
        // `next` es SIEMPRE el número que se asignará la próxima vez. Al crear
        // la fila se pone en 2 porque esta cotización se lleva el 1; en cada
        // choque se incrementa. En ambos casos el número que toca es `next - 1`,
        // así que no hace falta distinguir el primer guardado del año.
        const rows = await tx.$queryRaw<{ assigned: number }[]>`
          INSERT INTO "quote_counters" ("issueYear", "next", "updatedAt")
          VALUES (${issueYear}, 2, NOW())
          ON CONFLICT ("issueYear")
          DO UPDATE SET "next" = "quote_counters"."next" + 1, "updatedAt" = NOW()
          RETURNING "next" - 1 AS "assigned"
        `;

        const sequence = rows[0]?.assigned;
        if (sequence === undefined) {
          throw new Error(
            `No se pudo asignar consecutivo de cotización para ${issueYear}.`,
          );
        }

        const quote = await tx.quote.create({
          data: {
            reference: quoteReference(issueYear, sequence),
            issueYear,
            sequence,
            locale: draft.locale,
            parameterSetId: draft.parameterSetId,
            ...(draft.customerId ? { customerId: draft.customerId } : {}),
            ...(draft.createdById ? { createdById: draft.createdById } : {}),
            trmCommercial: draft.trmCommercial,
            trmFiscal: draft.trmFiscal,
            trmDate: draft.trmDate,
            subtotalUsd: draft.subtotalUsd,
            taxesCop: draft.taxesCop,
            landedCostCop: draft.landedCostCop,
            totalCop: draft.totalCop,
            ...(draft.totalCopCeiling !== null
              ? { totalCopCeiling: draft.totalCopCeiling }
              : {}),
            resolutionStatus: draft.resolutionStatus,
            estimatedDays: draft.estimatedDays,
            validUntil: draft.validUntil,
            snapshot: draft.snapshot as Prisma.InputJsonValue,
            snapshotVersion: draft.snapshotVersion,
            vehicles: {
              create: draft.vehicles.map((vehicle) => ({
                ...(vehicle.vehicleId ? { vehicleId: vehicle.vehicleId } : {}),
                descriptionEs: vehicle.descriptionEs,
                ...(vehicle.hsCodeValue ? { hsCodeValue: vehicle.hsCodeValue } : {}),
                ...(vehicle.powertrain ? { powertrain: vehicle.powertrain } : {}),
                ...(vehicle.originCountryCode
                  ? { originCountryCode: vehicle.originCountryCode }
                  : {}),
                ...(vehicle.modelYear !== null ? { modelYear: vehicle.modelYear } : {}),
                fobUsd: vehicle.fobUsd,
                cifUsd: vehicle.cifUsd,
                landedCostCop: vehicle.landedCostCop,
                containerShare: vehicle.containerShare,
              })),
            },
            lineItems: {
              create: draft.lineItems.map((item) => ({
                stageCode: item.stageCode,
                kind: item.kind,
                block: item.block,
                labelEs: item.labelEs,
                labelEn: item.labelEn,
                ...(item.noteEs ? { noteEs: item.noteEs } : {}),
                ...(item.noteEn ? { noteEn: item.noteEn } : {}),
                currency: item.currency,
                ...(item.amountUsd !== null ? { amountUsd: item.amountUsd } : {}),
                amountCop: item.amountCop,
                ...(item.appliedRuleId ? { appliedRuleId: item.appliedRuleId } : {}),
                ...(item.appliedRuleKind
                  ? { appliedRuleKind: item.appliedRuleKind }
                  : {}),
                ...(item.legalBasis ? { legalBasis: item.legalBasis } : {}),
                ...(item.baseKind
                  ? {
                      baseKind: item.baseKind as Exclude<
                        Prisma.QuoteLineItemCreateInput["baseKind"],
                        undefined
                      >,
                    }
                  : {}),
                ...(item.baseAmountCop !== null
                  ? { baseAmountCop: item.baseAmountCop }
                  : {}),
                ...(item.rateApplied !== null ? { rateApplied: item.rateApplied } : {}),
                resolutionStatus: item.resolutionStatus,
                ...(item.warning ? { warning: item.warning } : {}),
                sortOrder: item.sortOrder,
              })),
            },
          },
          select: {
            id: true,
            reference: true,
            issueYear: true,
            sequence: true,
            validUntil: true,
          },
        });

        return {
          id: quote.id,
          reference: quote.reference,
          issueYear: quote.issueYear,
          sequence: quote.sequence,
          validUntil: quote.validUntil ?? draft.validUntil,
        };
      }),
  };
}
