import type { CostStage } from "../stage";
import {
  addOns,
  commercialGmf,
  commercialMargin,
  commercialPaymentCosts,
  commercialServiceFee,
} from "./commercial";
import { destinationCosts } from "./destination";
import { freightCif, freightInsurance, freightOcean, freightSurcharges } from "./freight";
import {
  originAuctionFee,
  originBuyerFee,
  originExportDocs,
  originFob,
  originInland,
  originOther,
  originPurchase,
} from "./origin";
import { taxArancel, taxImpoconsumo, taxIva } from "./tax";

/**
 * EL REGISTRO.
 *
 * Añadir un tributo, un recargo o un concepto de destino es escribir un archivo
 * de etapa y añadir una entrada aquí. `liquidate()` no se toca nunca.
 *
 * El orden de este array es irrelevante: `resolveStageOrder` ordena por el
 * campo `order` y por las dependencias declaradas en `requires`.
 */
export const STAGES: readonly CostStage[] = [
  // ORIGEN
  originPurchase,
  originAuctionFee,
  originBuyerFee,
  originInland,
  originExportDocs,
  originOther,
  originFob,

  // FLETE Y SEGURO
  freightOcean,
  freightSurcharges,
  freightInsurance,
  freightCif,

  // NACIONALIZACIÓN — se calcula antes que los tributos, se muestra después
  destinationCosts,

  // TRIBUTOS
  taxArancel,
  taxImpoconsumo,
  taxIva,

  // SERVICIOS
  addOns,

  // COMERCIAL
  commercialMargin,
  commercialServiceFee,
  commercialPaymentCosts,
  commercialGmf,
];

export * from "./commercial";
export * from "./destination";
export * from "./freight";
export * from "./origin";
export * from "./tax";
