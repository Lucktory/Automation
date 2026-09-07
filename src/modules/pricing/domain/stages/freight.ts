import { Money } from "@/core/money";
import { prorate } from "../proration";
import type { CostStage } from "../stage";
import type { LineItem } from "../types";

/**
 * Bloque FLETE Y SEGURO.
 *
 * Aquí ocurre la consolidación: el costo del contenedor se reparte entre las
 * unidades que lo comparten, y esta liquidación se queda con la parte de la
 * PRIMERA unidad. También aquí se cierra el CIF, que es la base del arancel.
 */

const ORDER_OCEAN = 110;
const ORDER_SURCHARGES = 120;
const ORDER_INSURANCE = 130;
const ORDER_CIF = 140;

/** Umbral de antigüedad por defecto de una tarifa de flete, en días. */
const DEFAULT_FREIGHT_STALE_DAYS = 21;

export const freightOcean: CostStage = {
  code: "FREIGHT.OCEAN",
  block: "FREIGHT",
  order: ORDER_OCEAN,
  displayOrder: ORDER_OCEAN,
  requires: ["FREIGHT.FOB"],
  appliesTo: () => true,
  compute: (ctx) => {
    const { units, commercialMethod, taxableBaseMethod } = ctx.input.consolidation;

    const container = ctx.usd(ctx.input.freight.containerCostUsd);

    // DOS repartos, y NO son intercambiables.
    //
    // El comercial decide qué se le cobra al cliente y admite volumen. El de
    // base gravable decide qué flete entra en el VALOR EN ADUANA, y solo admite
    // valor FOB o peso: la Res. 1684 de 2014 CAN exige datos objetivos con
    // documento soporte, y el volumen ocupado no consta ni en el B/L ni en la
    // factura. Liquidar tributos sobre el reparto comercial sería ilegal además
    // de barato.
    const commercial = prorate(container, units, commercialMethod);
    const taxable = prorate(container, units, taxableBaseMethod);

    ctx.freightProration = commercial;
    ctx.taxableBaseProration = taxable;

    const share = commercial.rows[0]?.allocated ?? Money.zero("USD");
    const taxableShare = taxable.rows[0]?.allocated ?? Money.zero("USD");
    ctx.taxableFreightUsd = taxableShare;

    if (!share.equals(taxableShare)) {
      ctx.warn({
        code: "FREIGHT_ALLOCATION_DIVERGES",
        level: "INFO",
        message:
          `El flete cobrado (${share.toString()}) y el flete que entra en el valor en aduana ` +
          `(${taxableShare.toString()}) difieren porque los métodos de reparto son distintos. ` +
          "Es correcto: el comercial es una decisión de negocio, el aduanero está reglado.",
      });
    }

    const staleAfter = ctx.input.freight.staleAfterDays ?? DEFAULT_FREIGHT_STALE_DAYS;
    const age = ctx.input.freight.quotedDaysAgo ?? 0;
    const isStale = age > staleAfter;

    if (isStale) {
      ctx.warn({
        code: "FREIGHT_STALE",
        level: "WARN",
        message: `La tarifa de flete se cotizó hace ${age} días y su vigencia es de ${staleAfter}. Recotizar antes de comprometer precio.`,
      });
    }

    return [
      {
        code: "FREIGHT.OCEAN",
        block: "FREIGHT",
        amountUsd: share,
        amountCop: ctx.toCop(share),
        status: isStale ? "VALOR_CON_ADVERTENCIA" : "VALOR",
        ...(isStale
          ? { warning: `Tarifa de hace ${age} días; vigencia ${staleAfter}.` }
          : {}),
        displayOrder: ORDER_OCEAN,
      },
    ];
  },
};

export const freightSurcharges: CostStage = {
  code: "FREIGHT.SURCHARGES",
  block: "FREIGHT",
  order: ORDER_SURCHARGES,
  displayOrder: ORDER_SURCHARGES,
  requires: ["FREIGHT.OCEAN"],
  appliesTo: (ctx) => ctx.input.freight.surchargesUsd > 0,
  compute: (ctx) => {
    const total = ctx.usd(ctx.input.freight.surchargesUsd);
    const share =
      prorate(total, ctx.input.consolidation.units, ctx.input.consolidation.commercialMethod)
        .rows[0]?.allocated ?? Money.zero("USD");
    return [
      {
        code: "FREIGHT.SURCHARGES",
        block: "FREIGHT",
        amountUsd: share,
        amountCop: ctx.toCop(share),
        status: "VALOR",
        displayOrder: ORDER_SURCHARGES,
      },
    ];
  },
};

/**
 * Seguro de transporte. Se calcula sobre FOB + flete + recargos, con el recargo
 * habitual sobre el valor asegurado, y respeta la prima mínima.
 */
export const freightInsurance: CostStage = {
  code: "FREIGHT.INSURANCE",
  block: "FREIGHT",
  order: ORDER_INSURANCE,
  displayOrder: ORDER_INSURANCE,
  requires: ["FREIGHT.OCEAN"],
  appliesTo: (ctx) => ctx.input.freight.insuranceRate > 0,
  compute: (ctx) => {
    const { insuranceRate, insuredValueUplift, insuranceMinimumUsd } = ctx.input.freight;

    const insurable = ctx
      .amountUsd("FREIGHT.FOB")
      .plus(ctx.amountUsd("FREIGHT.OCEAN"))
      .plus(ctx.amountUsd("FREIGHT.SURCHARGES"));

    const premium = insurable.times(1 + insuredValueUplift).times(insuranceRate);
    const minimum = ctx.usd(insuranceMinimumUsd);
    const applied = premium.compare(minimum) < 0 ? minimum : premium;

    return [
      {
        code: "FREIGHT.INSURANCE",
        block: "FREIGHT",
        amountUsd: applied,
        amountCop: ctx.toCop(applied),
        rateApplied: insuranceRate,
        status: "VALOR",
        displayOrder: ORDER_INSURANCE,
      },
    ];
  },
};

/**
 * CIF — valor en aduana. Subtotal, no un costo nuevo: `isSubtotal` lo excluye
 * de las sumas por bloque para que no se cuente dos veces.
 *
 * Es la base del arancel, y la conversión a pesos usa la TRM FISCAL (último día
 * hábil de la semana anterior), no la del día.
 */
export const freightCif: CostStage = {
  code: "FREIGHT.CIF",
  block: "FREIGHT",
  order: ORDER_CIF,
  displayOrder: ORDER_CIF,
  requires: ["FREIGHT.OCEAN", "FREIGHT.FOB"],
  appliesTo: () => true,
  compute: (ctx): LineItem[] => {
    // El flete que entra aquí es el del reparto de BASE GRAVABLE, no el
    // comercial. Esta línea es el valor en aduana: alimenta las bases del
    // arancel, del IVA y del impoconsumo.
    const cifUsd = ctx
      .amountUsd("FREIGHT.FOB")
      .plus(ctx.taxableFreightUsd)
      .plus(ctx.amountUsd("FREIGHT.SURCHARGES"))
      .plus(ctx.amountUsd("FREIGHT.INSURANCE"));

    return [
      {
        code: "FREIGHT.CIF",
        block: "FREIGHT",
        amountUsd: cifUsd,
        amountCop: ctx.toCop(cifUsd),
        isSubtotal: true,
        legalBasis:
          "Valor en aduana · Dto 1165/2019 art. 16 · flete prorrateado por " +
          "valor FOB o peso (Res. 1684 de 2014 CAN)",
        status: "VALOR",
        displayOrder: ORDER_CIF,
      },
    ];
  },
};
