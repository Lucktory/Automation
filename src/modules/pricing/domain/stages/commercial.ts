import type { CostStage } from "../stage";
import type { LineItem } from "../types";

/**
 * Bloques SERVICIOS ADICIONALES y COMERCIAL.
 *
 * El detalle que importa aquí: **el costo de pasarela se calcula solo sobre el
 * anticipo**, nunca sobre el precio total. Ninguna pasarela colombiana puede
 * cobrar un vehículo completo — PSE tiene tope de ~COP 2,4 millones por
 * transacción y Bre-B de ~COP 11,5 millones — así que aplicar la comisión al
 * total infla el landed cost con un costo que no existe.
 */

const ORDER_ADDONS = 350;
const ORDER_ADDONS_DISPLAY = 310;
const ORDER_MARGIN = 410;
const ORDER_SERVICE_FEE = 420;
const ORDER_PAYMENT = 430;
const ORDER_GMF = 440;

export const addOns: CostStage = {
  code: "ADDON.ALL",
  block: "ADDON",
  order: ORDER_ADDONS,
  displayOrder: ORDER_ADDONS_DISPLAY,
  requires: ["FREIGHT.CIF"],
  appliesTo: (ctx) => ctx.input.addOns.length > 0,
  compute: (ctx): LineItem[] =>
    ctx.input.addOns.map((addOn, index) => {
      const isUsd = addOn.currency === "USD";
      const value = isUsd ? ctx.usd(addOn.price) : ctx.cop(addOn.price);
      return {
        code: `ADDON.${addOn.code}`,
        block: "ADDON",
        amountUsd: isUsd ? value : null,
        amountCop: isUsd ? ctx.toCop(value) : value,
        status: "VALOR",
        displayOrder: ORDER_ADDONS_DISPLAY + index,
      };
    }),
};

/**
 * Margen comercial sobre el landed cost, es decir sobre todo lo acumulado
 * hasta aquí. Depende de tributos y destino, así que corre al final.
 */
export const commercialMargin: CostStage = {
  code: "COMMERCIAL.MARGIN",
  block: "COMMERCIAL",
  order: ORDER_MARGIN,
  displayOrder: ORDER_MARGIN,
  requires: ["TAX.ARANCEL", "DESTINATION.ALL"],
  appliesTo: (ctx) => ctx.input.commercial.marginRate > 0,
  compute: (ctx): LineItem[] => {
    const landed = ctx.base("LANDED");
    return [
      {
        code: "COMMERCIAL.MARGIN",
        block: "COMMERCIAL",
        amountUsd: null,
        amountCop: landed.times(ctx.input.commercial.marginRate),
        baseKind: "LANDED",
        baseAmountCop: landed,
        rateApplied: ctx.input.commercial.marginRate,
        status: "VALOR",
        displayOrder: ORDER_MARGIN,
      },
    ];
  },
};

export const commercialServiceFee: CostStage = {
  code: "COMMERCIAL.SERVICE_FEE",
  block: "COMMERCIAL",
  order: ORDER_SERVICE_FEE,
  displayOrder: ORDER_SERVICE_FEE,
  requires: ["COMMERCIAL.MARGIN"],
  appliesTo: (ctx) => ctx.input.commercial.serviceFeeCop > 0,
  compute: (ctx): LineItem[] => [
    {
      code: "COMMERCIAL.SERVICE_FEE",
      block: "COMMERCIAL",
      amountUsd: null,
      amountCop: ctx.cop(ctx.input.commercial.serviceFeeCop),
      status: "VALOR",
      displayOrder: ORDER_SERVICE_FEE,
    },
  ],
};

export const commercialPaymentCosts: CostStage = {
  code: "COMMERCIAL.PAYMENT",
  block: "COMMERCIAL",
  order: ORDER_PAYMENT,
  displayOrder: ORDER_PAYMENT,
  requires: ["COMMERCIAL.MARGIN"],
  appliesTo: (ctx) =>
    ctx.input.commercial.paymentProcessingRate > 0 && ctx.input.commercial.depositCop > 0,
  compute: (ctx): LineItem[] => {
    // SOLO sobre el anticipo. Ver la nota de cabecera de este archivo.
    const deposit = ctx.cop(ctx.input.commercial.depositCop);
    return [
      {
        code: "COMMERCIAL.PAYMENT",
        block: "COMMERCIAL",
        amountUsd: null,
        amountCop: deposit.times(ctx.input.commercial.paymentProcessingRate),
        baseAmountCop: deposit,
        rateApplied: ctx.input.commercial.paymentProcessingRate,
        legalBasis:
          "Calculado sobre el anticipo. Ninguna pasarela colombiana puede procesar el precio total.",
        status: "VALOR",
        displayOrder: ORDER_PAYMENT,
      },
    ];
  },
};

export const commercialGmf: CostStage = {
  code: "COMMERCIAL.GMF",
  block: "COMMERCIAL",
  order: ORDER_GMF,
  displayOrder: ORDER_GMF,
  requires: ["COMMERCIAL.MARGIN"],
  appliesTo: (ctx) => ctx.input.commercial.gmfRate > 0,
  compute: (ctx): LineItem[] => {
    const landed = ctx.base("LANDED");
    return [
      {
        code: "COMMERCIAL.GMF",
        block: "COMMERCIAL",
        amountUsd: null,
        amountCop: landed.times(ctx.input.commercial.gmfRate),
        baseAmountCop: landed,
        rateApplied: ctx.input.commercial.gmfRate,
        legalBasis: "Gravamen a los movimientos financieros (4x1000)",
        status: "VALOR",
        displayOrder: ORDER_GMF,
      },
    ];
  },
};
