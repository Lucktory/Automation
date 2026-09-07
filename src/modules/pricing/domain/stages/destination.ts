import { Money } from "@/core/money";
import type { PricingContext } from "../context";
import type { CostStage } from "../stage";
import type { DestinationCostInput, LineItem } from "../types";

/**
 * Bloque NACIONALIZACIÓN Y DESTINO.
 *
 * Se calcula ANTES que los tributos aunque se muestre después, porque la base
 * del impoconsumo incluye los gastos de nacionalización marcados
 * `inExciseBase`. Ese perímetro es un parámetro y no un supuesto: qué rubros
 * entran exactamente está en consulta con la SIA.
 *
 * Una sola etapa emite todas las líneas, leyendo las reglas de destino que le
 * pasan. Agregar un concepto nuevo es agregar una fila en /admin/parametros,
 * no tocar este archivo.
 */

const ORDER_COMPUTE = 210;
const ORDER_DISPLAY = 240;

function evaluate(
  ctx: PricingContext,
  rule: DestinationCostInput,
): Money {
  const amount = rule.currency === "USD" ? ctx.usd(rule.amount) : ctx.cop(rule.amount);
  const amountCop = rule.currency === "USD" ? ctx.toCop(amount) : amount;

  switch (rule.method) {
    case "FIXED":
    case "PER_VEHICLE":
      return amountCop;

    case "PER_CONTAINER": {
      // El cargo es del contenedor: se divide entre las unidades que lo comparten.
      const units = ctx.input.consolidation.units.length;
      const parts = amountCop.allocateEvenly(units);
      return parts[0] ?? Money.zero("COP");
    }

    case "PER_DAY": {
      const days = rule.days ?? ctx.input.switches.portDays;
      return amountCop.times(days);
    }

    case "PERCENT_OF_FOB":
      return applyMinimum(ctx.base("FOB").times(rule.rate ?? 0), rule, ctx);

    case "PERCENT_OF_CIF":
      return applyMinimum(ctx.base("CIF").times(rule.rate ?? 0), rule, ctx);

    case "PERCENT_OF_LANDED":
    case "PERCENT_OF_SUBTOTAL":
      return applyMinimum(ctx.base("LANDED").times(rule.rate ?? 0), rule, ctx);
  }
}

function applyMinimum(
  computed: Money,
  rule: DestinationCostInput,
  ctx: PricingContext,
): Money {
  if (rule.minimum === undefined) return computed;
  const minimum = ctx.cop(rule.minimum);
  return computed.compare(minimum) < 0 ? minimum : computed;
}

export const destinationCosts: CostStage = {
  code: "DESTINATION.ALL",
  block: "DESTINATION",
  order: ORDER_COMPUTE,
  displayOrder: ORDER_DISPLAY,
  requires: ["FREIGHT.CIF"],
  appliesTo: (ctx) => ctx.input.destination.length > 0,
  compute: (ctx): LineItem[] =>
    ctx.input.destination.map((rule, index) => {
      const unverified = rule.confidence === "UNVERIFIED";

      if (unverified) {
        ctx.warn({
          code: "DESTINATION_COST_UNVERIFIED",
          level: "WARN",
          message: `El costo de destino "${rule.code}" no está verificado. Confirmar antes de cotizar en firme.`,
        });
      }

      return {
        code: `DESTINATION.${rule.code}`,
        block: "DESTINATION",
        amountUsd: null,
        amountCop: evaluate(ctx, rule),
        ...(rule.rate !== undefined ? { rateApplied: rule.rate } : {}),
        ...(rule.legalBasis !== undefined ? { legalBasis: rule.legalBasis } : {}),
        status: unverified ? "VALOR_CON_ADVERTENCIA" : "VALOR",
        ...(unverified ? { warning: "Costo sin verificar." } : {}),
        displayOrder: ORDER_DISPLAY + index,
      };
    }),
};
