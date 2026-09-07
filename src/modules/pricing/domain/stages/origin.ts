import type { PricingContext } from "../context";
import type { CostStage } from "../stage";
import type { LineItem } from "../types";

/**
 * Bloque ORIGEN — todo lo que se paga antes de que la unidad se embarque.
 * La suma de estas líneas es el FOB, que a su vez decide el umbral del
 * impoconsumo (8 % o 16 %).
 */

function usdLine(
  ctx: PricingContext,
  code: string,
  amount: number,
  displayOrder: number,
): LineItem {
  const value = ctx.usd(amount);
  return {
    code,
    block: "ORIGIN",
    amountUsd: value,
    amountCop: ctx.toCop(value),
    status: "VALOR",
    displayOrder,
  };
}

const ORDER_PURCHASE = 10;
const ORDER_AUCTION_FEE = 20;
const ORDER_BUYER_FEE = 30;
const ORDER_INLAND = 40;
const ORDER_EXPORT_DOCS = 50;
const ORDER_OTHER = 60;
const ORDER_FOB = 70;

export const originPurchase: CostStage = {
  code: "ORIGIN.PURCHASE",
  block: "ORIGIN",
  order: ORDER_PURCHASE,
  displayOrder: ORDER_PURCHASE,
  appliesTo: () => true,
  compute: (ctx) => [
    usdLine(ctx, "ORIGIN.PURCHASE", ctx.input.origin.purchasePriceUsd, ORDER_PURCHASE),
  ],
};

export const originAuctionFee: CostStage = {
  code: "ORIGIN.AUCTION_FEE",
  block: "ORIGIN",
  order: ORDER_AUCTION_FEE,
  displayOrder: ORDER_AUCTION_FEE,
  appliesTo: (ctx) => ctx.input.origin.auctionFeeUsd > 0,
  compute: (ctx) => [
    usdLine(ctx, "ORIGIN.AUCTION_FEE", ctx.input.origin.auctionFeeUsd, ORDER_AUCTION_FEE),
  ],
};

export const originBuyerFee: CostStage = {
  code: "ORIGIN.BUYER_FEE",
  block: "ORIGIN",
  order: ORDER_BUYER_FEE,
  displayOrder: ORDER_BUYER_FEE,
  appliesTo: (ctx) => ctx.input.origin.buyerFeeUsd > 0,
  compute: (ctx) => [
    usdLine(ctx, "ORIGIN.BUYER_FEE", ctx.input.origin.buyerFeeUsd, ORDER_BUYER_FEE),
  ],
};

export const originInland: CostStage = {
  code: "ORIGIN.INLAND",
  block: "ORIGIN",
  order: ORDER_INLAND,
  displayOrder: ORDER_INLAND,
  appliesTo: (ctx) => ctx.input.origin.inlandFreightUsd > 0,
  compute: (ctx) => [
    usdLine(ctx, "ORIGIN.INLAND", ctx.input.origin.inlandFreightUsd, ORDER_INLAND),
  ],
};

export const originExportDocs: CostStage = {
  code: "ORIGIN.EXPORT_DOCS",
  block: "ORIGIN",
  order: ORDER_EXPORT_DOCS,
  displayOrder: ORDER_EXPORT_DOCS,
  appliesTo: (ctx) => ctx.input.origin.exportDocsUsd > 0,
  compute: (ctx) => [
    usdLine(ctx, "ORIGIN.EXPORT_DOCS", ctx.input.origin.exportDocsUsd, ORDER_EXPORT_DOCS),
  ],
};

export const originOther: CostStage = {
  code: "ORIGIN.OTHER",
  block: "ORIGIN",
  order: ORDER_OTHER,
  displayOrder: ORDER_OTHER,
  appliesTo: (ctx) => ctx.input.origin.otherUsd > 0,
  compute: (ctx) => [
    usdLine(ctx, "ORIGIN.OTHER", ctx.input.origin.otherUsd, ORDER_OTHER),
  ],
};

/**
 * FOB — subtotal, no un costo nuevo.
 *
 * Se emite como línea con importe cero para no duplicarse en los totales, pero
 * lleva su valor en `baseAmountCop`: el umbral del impoconsumo se mide contra
 * el FOB en USD, y el desglose necesita mostrarlo.
 */
export const originFob: CostStage = {
  code: "FREIGHT.FOB",
  block: "ORIGIN",
  order: ORDER_FOB,
  displayOrder: ORDER_FOB,
  requires: ["ORIGIN.PURCHASE"],
  appliesTo: () => true,
  compute: (ctx) => {
    const fob = ctx.blockTotalUsd("ORIGIN");
    return [
      {
        code: "FREIGHT.FOB",
        block: "ORIGIN",
        amountUsd: fob,
        amountCop: ctx.toCop(fob),
        isSubtotal: true,
        baseAmountCop: ctx.toCop(fob),
        status: "VALOR",
        displayOrder: ORDER_FOB,
      },
    ];
  },
};
