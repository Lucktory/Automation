import { Money } from "@/core/money";
import { PricingContext } from "../domain/context";
import { estimateTimeline } from "../domain/timeline";
import { resolveStageOrder, type CostStage } from "../domain/stage";
import { STAGES } from "../domain/stages";
import type { LiquidationInput, LiquidationResult, ProrationResult } from "../domain/types";

const COP = "COP" as const;
const USD = "USD" as const;

/**
 * Techo de la banda cuando algún interruptor determinante quedó sin cerrar.
 * El motor está sesgado a subcotizar, y subcotizar destruye la empresa; así que
 * mientras haya una advertencia se ofrece una banda, no una cifra única.
 */
const UNCERTAINTY_CEILING = 1.15;

const EMPTY_PRORATION = (currency: "COP" | "USD"): ProrationResult => ({
  method: "EQUAL_SHARE",
  rows: [],
  total: Money.zero(currency),
  residue: Money.zero(currency),
});

/**
 * Ejecuta la cadena de liquidación.
 *
 * Nótese lo que este archivo NO hace: no sabe qué es un arancel, no conoce una
 * sola tarifa, y no tiene una rama por tipo de costo. Solo ordena el registro y
 * pliega. Agregar un tributo nuevo no toca esta función.
 *
 * Es una función PURA: sin red, sin base de datos, sin reloj. Corre igual en el
 * servidor para la cotización oficial y en el navegador para el simulador.
 */
export function liquidate(
  input: LiquidationInput,
  stages: readonly CostStage[] = STAGES,
): LiquidationResult {
  const ctx = PricingContext.create(input);

  for (const stage of resolveStageOrder(stages)) {
    if (!stage.appliesTo(ctx)) continue;
    ctx.record(stage, stage.compute(ctx));
  }

  const lineItems = [...ctx.lines].sort((a, b) => a.displayOrder - b.displayOrder);

  const fobUsd = ctx.amountUsd("FREIGHT.FOB");
  const cifUsd = ctx.amountUsd("FREIGHT.CIF");
  const cifCop = ctx.amountCop("FREIGHT.CIF");

  const taxesCop = ctx.blockTotalCop("TAX");
  const destinationCop = ctx.blockTotalCop("DESTINATION");
  const addOnsCop = ctx.blockTotalCop("ADDON");
  const commercialCop = ctx.blockTotalCop("COMMERCIAL");

  // Landed cost = todo menos el margen comercial: es el costo real de poner la
  // unidad en manos del cliente.
  const landedCostCop = Money.sum(
    lineItems
      .filter((l) => !l.isSubtotal && l.block !== "COMMERCIAL")
      .map((l) => l.amountCop),
    COP,
  );

  const totalCop = landedCostCop.plus(commercialCop);

  const hasOpenSwitch = ctx.status !== "VALOR";
  const totalCopCeiling = hasOpenSwitch ? totalCop.times(UNCERTAINTY_CEILING) : null;

  if (ctx.input.fx.trmSource === "MANUAL") {
    ctx.warn({
      code: "TRM_MANUAL_OVERRIDE",
      level: "INFO",
      message: `La TRM usada (${ctx.input.fx.trmFiscal}) es un override manual del ${ctx.input.fx.trmDate}.`,
    });
  }

  return {
    lineItems,
    fobUsd,
    cifUsd,
    cifCop,
    taxesCop,
    destinationCop,
    addOnsCop,
    landedCostCop,
    totalCop,
    totalCopCeiling,
    freightProration: ctx.freightProration ?? EMPTY_PRORATION(USD),
    taxableBaseProration: ctx.taxableBaseProration ?? EMPTY_PRORATION(USD),
    timeline: estimateTimeline(input.timeline),
    status: ctx.status,
    warnings: ctx.warnings,
    fx: input.fx,
  };
}
