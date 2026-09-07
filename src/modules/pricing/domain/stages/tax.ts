import type { CostStage } from "../stage";
import type { LineItem } from "../types";

/**
 * Bloque TRIBUTOS.
 *
 * La corrección más importante del motor vive aquí: **el IVA y el impoconsumo
 * NO comparten base**. Se calculan en PARALELO desde bases distintas,
 * gobernadas por artículos distintos:
 *
 *   arancel     ← valor en aduana (CIF)             Dto 1165/2019 art. 16
 *   IVA         ← valor en aduana + arancel         ET art. 459
 *   impoconsumo ← valor total del bien, sin IVA     ET art. 512-3 par. 3
 *
 * Ningún tributo entra en la base de otro, salvo el arancel, que entra en las
 * dos. Ningún archivo de este bloque contiene una tarifa: todas vienen de la
 * `TariffRule` resuelta.
 */

const ORDER_ARANCEL = 210;
const ORDER_IMPOCONSUMO = 220;
const ORDER_IVA = 230;

export const taxArancel: CostStage = {
  code: "TAX.ARANCEL",
  block: "TAX",
  // Se calcula DESPUÉS de los costos de destino, porque la base del impoconsumo
  // los incluye, pero se MUESTRA antes. Por eso order != displayOrder.
  order: 310,
  displayOrder: ORDER_ARANCEL,
  requires: ["FREIGHT.CIF"],
  appliesTo: () => true,
  compute: (ctx): LineItem[] => {
    const rule = ctx.input.tariff;
    const base = ctx.base(rule.dutyBase);

    // Sin certificado de origen no hay preferencia: se liquida al arancel NMF.
    // Este es el interruptor más caro del motor — hasta 40 puntos del CIF.
    //
    // La condición es que la REGLA EXIJA certificado, no que su tarifa sea
    // cero. Una desgravación escalonada, un cupo o el ACE 33 dan preferencias
    // parciales (5 %, 10 %) que también dependen del certificado; condicionar
    // el candado a `dutyRate === 0` lo dejaba mudo en todas ellas.
    const missingCertificate =
      rule.requiresOriginCertificate && !ctx.input.vehicle.hasOriginCertificate;

    if (missingCertificate) {
      ctx.warn({
        code: "ORIGIN_CERTIFICATE_MISSING",
        level: "BLOCK",
        message:
          "La regla aplica arancel preferencial pero la unidad no tiene certificado de origen. " +
          "Sin él se liquida al arancel NMF. No se puede cotizar en firme.",
      });
    }

    return [
      {
        code: "TAX.ARANCEL",
        block: "TAX",
        amountUsd: null,
        amountCop: base.times(rule.dutyRate),
        baseKind: rule.dutyBase,
        baseAmountCop: base,
        rateApplied: rule.dutyRate,
        legalBasis: rule.legalBasis,
        appliedRuleId: rule.ruleId,
        status: missingCertificate ? "NO_COTIZABLE" : rule.status,
        ...(missingCertificate
          ? { warning: "Falta certificado de origen para la preferencia arancelaria." }
          : rule.warning
            ? { warning: rule.warning }
            : {}),
        displayOrder: ORDER_ARANCEL,
      },
    ];
  },
};

/**
 * Impoconsumo.
 *
 * Dos condiciones lo apagan por completo:
 *  1. los vehículos 100 % eléctricos no blindados están excluidos (ET 512-5 n.º 8);
 *  2. solo se causa en la importación cuando el importador ES el consumidor
 *     final (ET 512-1 n.º 2). Si la plataforma importa para revender, se causa
 *     después, en la venta, sobre una base mayor.
 *
 * La tarifa depende de un umbral medido sobre el FOB en USD, no sobre el CIF, y
 * el umbral es nominal: no está indexado a UVT.
 */
export const taxImpoconsumo: CostStage = {
  code: "TAX.IMPOCONSUMO",
  block: "TAX",
  order: 320,
  displayOrder: ORDER_IMPOCONSUMO,
  requires: ["TAX.ARANCEL"],
  appliesTo: (ctx) => {
    const rule = ctx.input.tariff;
    if (!rule.exciseAppliesOnImport) return false;
    if (!ctx.input.switches.importerIsEndConsumer) return false;
    return rule.exciseRate > 0 || (rule.exciseRateAboveThreshold ?? 0) > 0;
  },
  compute: (ctx): LineItem[] => {
    const rule = ctx.input.tariff;
    const base = ctx.base(rule.exciseBase);

    const fobUsd = ctx.amountUsd("FREIGHT.FOB").toNumber();
    const threshold = rule.exciseThresholdFobUsd;

    // "El umbral se superó" y "hay tarifa alta parametrizada" son dos cosas
    // distintas. Mezclarlas hacía que una escala incompleta cayera a la tarifa
    // BAJA en silencio, justo por encima del umbral — fallar hacia abajo.
    const aboveThreshold = threshold !== null && fobUsd >= threshold;
    const highRateMissing = aboveThreshold && rule.exciseRateAboveThreshold === null;

    if (highRateMissing) {
      ctx.warn({
        code: "EXCISE_HIGH_RATE_MISSING",
        level: "BLOCK",
        message:
          `El FOB (US$ ${fobUsd}) supera el umbral de US$ ${threshold} pero la regla ` +
          `${rule.ruleId} no define la tarifa alta del impoconsumo. No se cotiza en firme.`,
      });
    }

    const rate =
      aboveThreshold && rule.exciseRateAboveThreshold !== null
        ? rule.exciseRateAboveThreshold
        : rule.exciseRate;

    return [
      {
        code: "TAX.IMPOCONSUMO",
        block: "TAX",
        amountUsd: null,
        amountCop: base.times(rate),
        baseKind: rule.exciseBase,
        baseAmountCop: base,
        rateApplied: rate,
        legalBasis: `ET arts. 512-3 y 512-4 · umbral FOB ${threshold ?? "n/a"} USD · ${rule.legalBasis}`,
        appliedRuleId: rule.ruleId,
        status: highRateMissing ? "NO_COTIZABLE" : rule.status,
        ...(highRateMissing
          ? { warning: "Falta la tarifa alta del impoconsumo para este umbral." }
          : {}),
        displayOrder: ORDER_IMPOCONSUMO,
      },
    ];
  },
};

export const taxIva: CostStage = {
  code: "TAX.IVA",
  block: "TAX",
  order: 330,
  displayOrder: ORDER_IVA,
  requires: ["TAX.ARANCEL"],
  appliesTo: (ctx) => ctx.input.tariff.vatRate > 0,
  compute: (ctx): LineItem[] => {
    const rule = ctx.input.tariff;
    // ET art. 459: valor en aduana + arancel. El impoconsumo NUNCA entra aquí.
    const base = ctx.base(rule.vatBase);

    return [
      {
        code: "TAX.IVA",
        block: "TAX",
        amountUsd: null,
        amountCop: base.times(rule.vatRate),
        baseKind: rule.vatBase,
        baseAmountCop: base,
        rateApplied: rule.vatRate,
        legalBasis: "ET art. 459 · base: valor en aduana más arancel",
        appliedRuleId: rule.ruleId,
        status: rule.status,
        displayOrder: ORDER_IVA,
      },
    ];
  },
};
