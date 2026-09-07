import { describe, expect, it } from "vitest";
import { liquidate, prorate, type ConsolidationUnit } from "@/modules/pricing";
import { Money } from "@/core/money";
import { baseInput } from "./fixtures";

/**
 * Regresiones de la revisión adversarial de M2.
 *
 * Cinco lentes independientes atacaron el motor y confirmaron seis defectos,
 * TODOS en la dirección de subcotizar. Cada uno tiene aquí su prueba, para que
 * no puedan volver.
 */

const line = (r: ReturnType<typeof liquidate>, code: string) =>
  r.lineItems.find((l) => l.code === code);

describe("[CRÍTICO] el valor en aduana usa el prorrateo de BASE GRAVABLE, no el comercial", () => {
  /**
   * El defecto: `taxableBaseProration` se calculaba, se publicaba en el
   * resultado y se descartaba. El CIF —base del arancel, del IVA y del
   * impoconsumo— se armaba con el reparto COMERCIAL, que admite BY_CBM.
   * Liquidar tributos sobre un reparto por volumen es ilegal (Res. 1684 de
   * 2014 CAN) además de, en este caso, más barato.
   */
  const divergent = () => {
    const input = baseInput();
    input.consolidation.commercialMethod = "BY_CBM";
    input.consolidation.taxableBaseMethod = "BY_WEIGHT";
    return input;
  };

  it("el flete dentro del CIF es el del reparto aduanero", () => {
    const result = liquidate(divergent());

    const freightInsideCif = result.cifUsd
      .minus(result.fobUsd)
      .minus(line(result, "FREIGHT.SURCHARGES")!.amountUsd!)
      .minus(line(result, "FREIGHT.INSURANCE")!.amountUsd!);

    expect(freightInsideCif.equals(result.taxableBaseProration.rows[0]!.allocated)).toBe(true);
  });

  it("NO es el del reparto comercial cuando los métodos difieren", () => {
    const result = liquidate(divergent());
    const commercialShare = result.freightProration.rows[0]!.allocated;
    const taxableShare = result.taxableBaseProration.rows[0]!.allocated;

    // El fixture está construido para que difieran: por peso la unidad paga
    // más que por volumen, así que el CIF correcto es MAYOR.
    expect(commercialShare.equals(taxableShare)).toBe(false);
    expect(taxableShare.compare(commercialShare)).toBe(1);

    const freightInsideCif = result.cifUsd
      .minus(result.fobUsd)
      .minus(line(result, "FREIGHT.SURCHARGES")!.amountUsd!)
      .minus(line(result, "FREIGHT.INSURANCE")!.amountUsd!);
    expect(freightInsideCif.equals(commercialShare)).toBe(false);
  });

  it("la línea de costo sigue siendo la comercial: es lo que se le cobra al cliente", () => {
    const result = liquidate(divergent());
    expect(
      line(result, "FREIGHT.OCEAN")!.amountUsd!.equals(result.freightProration.rows[0]!.allocated),
    ).toBe(true);
  });

  it("avisa cuando los dos repartos divergen", () => {
    const result = liquidate(divergent());
    expect(result.warnings.some((w) => w.code === "FREIGHT_ALLOCATION_DIVERGES")).toBe(true);
  });

  it("no avisa cuando ambos métodos coinciden en la práctica", () => {
    // BY_CIF_VALUE y BY_FOB_VALUE usan los mismos pesos: no hay divergencia.
    const result = liquidate(baseInput());
    expect(result.warnings.some((w) => w.code === "FREIGHT_ALLOCATION_DIVERGES")).toBe(false);
  });
});

describe("[ALTO] el candado del certificado de origen no depende de que la tarifa sea cero", () => {
  /**
   * El defecto: `dutyRate === 0 && requiresOriginCertificate`. Una preferencia
   * PARCIAL —desgravación escalonada, cupo, ACE 33— dejaba el candado mudo, y
   * la cotización salía como cifra firme al tipo preferencial sin comprobar el
   * certificado.
   */
  const partialPreference = (hasCertificate: boolean) => {
    const input = baseInput();
    input.tariff.dutyRate = 0.05;
    input.tariff.requiresOriginCertificate = true;
    input.vehicle.hasOriginCertificate = hasCertificate;
    return input;
  };

  it("bloquea una preferencia PARCIAL sin certificado", () => {
    const result = liquidate(partialPreference(false));
    expect(result.status).toBe("NO_COTIZABLE");
    expect(result.warnings.some((w) => w.code === "ORIGIN_CERTIFICATE_MISSING")).toBe(true);
    expect(result.totalCopCeiling).not.toBeNull();
  });

  it("bloquea también una preferencia total sin certificado", () => {
    const input = partialPreference(false);
    input.tariff.dutyRate = 0;
    expect(liquidate(input).status).toBe("NO_COTIZABLE");
  });

  it("no bloquea si el certificado existe", () => {
    expect(liquidate(partialPreference(true)).status).toBe("VALOR");
  });

  it("no bloquea si la regla no exige certificado", () => {
    const input = baseInput();
    input.tariff.dutyRate = 0.05;
    input.tariff.requiresOriginCertificate = false;
    input.vehicle.hasOriginCertificate = false;
    expect(liquidate(input).status).toBe("VALOR");
  });
});

describe("[ALTO] una escala de impoconsumo incompleta no cae a la tarifa barata", () => {
  /**
   * El defecto: `threshold !== null && exciseRateAboveThreshold !== null && fob >= threshold`.
   * Si faltaba la tarifa alta, la condición era falsa y el motor aplicaba la
   * BAJA justo por encima del umbral, en silencio.
   */
  const overThresholdWithoutHighRate = () => {
    const input = baseInput();
    input.origin.purchasePriceUsd = 45_000;
    input.tariff.exciseRate = 0.08;
    input.tariff.exciseAppliesOnImport = true;
    input.tariff.exciseThresholdFobUsd = 30_000;
    input.tariff.exciseRateAboveThreshold = null;
    return input;
  };

  it("bloquea en vez de aplicar la tarifa baja por encima del umbral", () => {
    const result = liquidate(overThresholdWithoutHighRate());
    expect(result.status).toBe("NO_COTIZABLE");
    expect(result.warnings.some((w) => w.code === "EXCISE_HIGH_RATE_MISSING")).toBe(true);
    expect(line(result, "TAX.IMPOCONSUMO")!.status).toBe("NO_COTIZABLE");
  });

  it("no bloquea por debajo del umbral, donde la tarifa baja sí corresponde", () => {
    const input = overThresholdWithoutHighRate();
    input.origin.purchasePriceUsd = 20_000;
    const result = liquidate(input);
    expect(result.status).toBe("VALOR");
    expect(line(result, "TAX.IMPOCONSUMO")!.rateApplied).toBe(0.08);
  });

  it("aplica la tarifa alta cuando sí está parametrizada", () => {
    const input = overThresholdWithoutHighRate();
    input.tariff.exciseRateAboveThreshold = 0.16;
    const result = liquidate(input);
    expect(result.status).toBe("VALOR");
    expect(line(result, "TAX.IMPOCONSUMO")!.rateApplied).toBe(0.16);
  });
});

describe("[ALTO] la base del impoconsumo no infla con valores fantasma", () => {
  /**
   * El defecto: los accesorios de fábrica se sumaban a la base del impoconsumo
   * y a ninguna otra — ni al CIF, ni al arancel, ni al IVA, ni al total. Ya
   * están dentro del precio de compra, así que era un doble conteo.
   */
  it("la base es exactamente CIF + arancel + gastos marcados inExciseBase", () => {
    const input = baseInput();
    input.tariff.dutyRate = 0.4;
    input.tariff.exciseRate = 0.08;
    input.tariff.exciseAppliesOnImport = true;
    const result = liquidate(input);

    const included = Money.sum(
      result.lineItems
        .filter((l) => {
          const rule = input.destination.find((d) => `DESTINATION.${d.code}` === l.code);
          return rule?.inExciseBase === true;
        })
        .map((l) => l.amountCop),
      "COP",
    );

    const expected = result.cifCop
      .plus(line(result, "TAX.ARANCEL")!.amountCop)
      .plus(included);

    expect(line(result, "TAX.IMPOCONSUMO")!.baseAmountCop!.equals(expected)).toBe(true);
  });
});

describe("[ALTO] datos ausentes no se reparten en partes iguales en silencio", () => {
  it("lanza cuando todos los pesos del prorrateo son cero", () => {
    const worthless: ConsolidationUnit[] = [
      { reference: "A", fobUsd: 0, weightKg: 0, cbm: 0 },
      { reference: "B", fobUsd: 0, weightKg: 0, cbm: 0 },
    ];
    expect(() => prorate(Money.of(4_850, "USD"), worthless, "BY_FOB_VALUE")).toThrow(RangeError);
    expect(() => prorate(Money.of(4_850, "USD"), worthless, "BY_WEIGHT")).toThrow(RangeError);
  });

  it("EQUAL_SHARE sigue funcionando: sus pesos nunca son cero", () => {
    const worthless: ConsolidationUnit[] = [
      { reference: "A", fobUsd: 0, weightKg: 0, cbm: 0 },
      { reference: "B", fobUsd: 0, weightKg: 0, cbm: 0 },
    ];
    const result = prorate(Money.of(100, "USD"), worthless, "EQUAL_SHARE");
    expect(result.rows.map((r) => r.allocated.toNumber())).toEqual([50, 50]);
  });
});

describe("[ALTO] una TRM inválida no produce una cotización de cero con cara de firme", () => {
  it("rechaza una TRM fiscal de cero", () => {
    const input = baseInput();
    input.fx.trmFiscal = 0;
    expect(() => liquidate(input)).toThrow(RangeError);
  });

  it("rechaza una TRM negativa", () => {
    const input = baseInput();
    input.fx.trmFiscal = -3_126.08;
    expect(() => liquidate(input)).toThrow(RangeError);
  });

  it("rechaza una TRM no finita", () => {
    const input = baseInput();
    input.fx.trmCommercial = Number.NaN;
    expect(() => liquidate(input)).toThrow(RangeError);
  });
});
