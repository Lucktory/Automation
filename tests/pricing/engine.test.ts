import { describe, expect, it } from "vitest";
import { Money } from "@/core/money";
import { liquidate, resolveStageOrder, STAGES } from "@/modules/pricing";
import { baseInput } from "./fixtures";

const line = (result: ReturnType<typeof liquidate>, code: string) =>
  result.lineItems.find((l) => l.code === code);

describe("registro de etapas", () => {
  it("ordena por dependencias sin ciclos", () => {
    const ordered = resolveStageOrder(STAGES);
    const seen = new Set<string>();
    for (const stage of ordered) {
      for (const dep of stage.requires ?? []) {
        expect(seen.has(dep)).toBe(true);
      }
      seen.add(stage.code);
    }
  });

  it("calcula los costos de destino ANTES que los tributos", () => {
    // La base del impoconsumo incluye gastos de nacionalización, así que el
    // orden de cálculo no puede ser el de presentación.
    const ordered = resolveStageOrder(STAGES).map((s) => s.code);
    expect(ordered.indexOf("DESTINATION.ALL")).toBeLessThan(ordered.indexOf("TAX.ARANCEL"));
  });

  it("muestra los tributos ANTES que la nacionalización", () => {
    const result = liquidate(baseInput());
    const positions = result.lineItems.map((l) => l.code);
    expect(positions.indexOf("TAX.IVA")).toBeLessThan(
      positions.indexOf("DESTINATION.PORT_UIP_BUN"),
    );
  });
});

describe("cadena de liquidación", () => {
  it("compone el FOB con todos los costos de origen", () => {
    const result = liquidate(baseInput());
    // 32.000 + 800 + 450 + 320
    expect(result.fobUsd.toNumber()).toBe(33_570);
  });

  it("compone el CIF como FOB + flete + recargos + seguro", () => {
    const result = liquidate(baseInput());
    const fob = result.fobUsd;
    const ocean = line(result, "FREIGHT.OCEAN")!.amountUsd!;
    const surcharges = line(result, "FREIGHT.SURCHARGES")!.amountUsd!;
    const insurance = line(result, "FREIGHT.INSURANCE")!.amountUsd!;
    expect(
      result.cifUsd.equals(fob.plus(ocean).plus(surcharges).plus(insurance)),
    ).toBe(true);
  });

  it("convierte a pesos con la TRM FISCAL, no con la comercial", () => {
    const input = baseInput();
    input.fx.trmCommercial = 4_000;
    input.fx.trmFiscal = 3_126.08;
    const result = liquidate(input);
    const expected = result.cifUsd.convertTo("COP", 3_126.08);
    expect(result.cifCop.equals(expected)).toBe(true);
  });

  it("no cuenta dos veces los subtotales FOB y CIF", () => {
    const result = liquidate(baseInput());
    const subtotals = result.lineItems.filter((l) => l.isSubtotal).map((l) => l.code);
    expect(subtotals).toContain("FREIGHT.FOB");
    expect(subtotals).toContain("FREIGHT.CIF");

    const sumOfNonSubtotals = Money.sum(
      result.lineItems.filter((l) => !l.isSubtotal).map((l) => l.amountCop),
      "COP",
    );
    expect(result.totalCop.equals(sumOfNonSubtotals)).toBe(true);
  });

  it("el total es el landed cost más el bloque comercial", () => {
    const result = liquidate(baseInput());
    const commercial = Money.sum(
      result.lineItems.filter((l) => l.block === "COMMERCIAL").map((l) => l.amountCop),
      "COP",
    );
    expect(result.totalCop.equals(result.landedCostCop.plus(commercial))).toBe(true);
  });
});

describe("bases gravables — la corrección que rompe a la mayoría de calculadoras", () => {
  it("la base del IVA es valor en aduana + arancel (ET art. 459)", () => {
    const input = baseInput();
    input.tariff.dutyRate = 0.4;
    input.tariff.vatRate = 0.19;
    const result = liquidate(input);

    const iva = line(result, "TAX.IVA")!;
    const arancel = line(result, "TAX.ARANCEL")!;
    expect(iva.baseAmountCop!.equals(result.cifCop.plus(arancel.amountCop))).toBe(true);
  });

  it("la base del IVA NUNCA incluye el impoconsumo", () => {
    const input = baseInput();
    input.tariff.dutyRate = 0.4;
    input.tariff.vatRate = 0.19;
    input.tariff.exciseRate = 0.08;
    input.tariff.exciseAppliesOnImport = true;
    const result = liquidate(input);

    const iva = line(result, "TAX.IVA")!;
    const inc = line(result, "TAX.IMPOCONSUMO")!;
    const ivaBase = iva.baseAmountCop!;

    // Si el INC estuviera dentro, la base del IVA sería mayor que CIF+arancel.
    expect(ivaBase.equals(result.cifCop.plus(line(result, "TAX.ARANCEL")!.amountCop))).toBe(true);
    expect(ivaBase.compare(ivaBase.plus(inc.amountCop))).toBe(-1);
  });

  it("la base del impoconsumo es distinta de la del IVA e incluye gastos de nacionalización", () => {
    const input = baseInput();
    input.tariff.dutyRate = 0.4;
    input.tariff.exciseRate = 0.08;
    input.tariff.exciseAppliesOnImport = true;
    const result = liquidate(input);

    const iva = line(result, "TAX.IVA")!;
    const inc = line(result, "TAX.IMPOCONSUMO")!;

    expect(inc.baseKind).toBe("TOTAL_VALUE_EXCL_IVA");
    expect(iva.baseKind).toBe("CIF_PLUS_ARANCEL");
    // El INC incluye los gastos marcados inExciseBase, así que su base es mayor.
    expect(inc.baseAmountCop!.compare(iva.baseAmountCop!)).toBe(1);
  });

  it("solo los gastos marcados inExciseBase entran en la base del impoconsumo", () => {
    const withPlates = baseInput();
    withPlates.tariff.exciseRate = 0.08;
    withPlates.tariff.exciseAppliesOnImport = true;

    const platesIncluded = baseInput();
    platesIncluded.tariff.exciseRate = 0.08;
    platesIncluded.tariff.exciseAppliesOnImport = true;
    platesIncluded.destination = platesIncluded.destination.map((r) =>
      r.code === "PLATES_BOGOTA" ? { ...r, inExciseBase: true } : r,
    );

    const a = liquidate(withPlates);
    const b = liquidate(platesIncluded);
    expect(
      line(b, "TAX.IMPOCONSUMO")!.baseAmountCop!.compare(
        line(a, "TAX.IMPOCONSUMO")!.baseAmountCop!,
      ),
    ).toBe(1);
  });

  it("aplica la tarifa alta del impoconsumo por umbral de FOB, no de CIF", () => {
    const below = baseInput();
    below.origin.purchasePriceUsd = 25_000;
    below.tariff.exciseRate = 0.08;
    below.tariff.exciseAppliesOnImport = true;

    const above = baseInput();
    above.origin.purchasePriceUsd = 45_000;
    above.tariff.exciseRate = 0.08;
    above.tariff.exciseAppliesOnImport = true;

    expect(line(liquidate(below), "TAX.IMPOCONSUMO")!.rateApplied).toBe(0.08);
    expect(line(liquidate(above), "TAX.IMPOCONSUMO")!.rateApplied).toBe(0.16);
  });
});

describe("interruptores determinantes", () => {
  it("un BEV no causa impoconsumo (ET art. 512-5 num. 8)", () => {
    const result = liquidate(baseInput());
    expect(line(result, "TAX.IMPOCONSUMO")).toBeUndefined();
  });

  it("no causa impoconsumo en la importación si el importador no es el consumidor final", () => {
    const input = baseInput();
    input.tariff.exciseRate = 0.08;
    input.tariff.exciseAppliesOnImport = true;
    input.switches.importerIsEndConsumer = false;
    expect(line(liquidate(input), "TAX.IMPOCONSUMO")).toBeUndefined();
  });

  it("bloquea la cotización si se reclama preferencia sin certificado de origen", () => {
    const input = baseInput();
    input.tariff.dutyRate = 0;
    input.tariff.requiresOriginCertificate = true;
    input.vehicle.hasOriginCertificate = false;

    const result = liquidate(input);
    expect(result.status).toBe("NO_COTIZABLE");
    expect(result.warnings.some((w) => w.code === "ORIGIN_CERTIFICATE_MISSING")).toBe(true);
  });

  it("no bloquea cuando el certificado sí existe", () => {
    const input = baseInput();
    input.tariff.requiresOriginCertificate = true;
    input.vehicle.hasOriginCertificate = true;
    expect(liquidate(input).status).toBe("VALOR");
  });
});

describe("fallar hacia arriba, nunca hacia abajo", () => {
  it("ofrece un techo de banda cuando queda un interruptor abierto", () => {
    const input = baseInput();
    input.tariff.status = "VALOR_CON_ADVERTENCIA";
    input.tariff.warning = "regla sin verificar";
    const result = liquidate(input);

    expect(result.totalCopCeiling).not.toBeNull();
    expect(result.totalCopCeiling!.compare(result.totalCop)).toBe(1);
  });

  it("no ofrece banda cuando todo está verificado", () => {
    expect(liquidate(baseInput()).totalCopCeiling).toBeNull();
  });

  it("advierte y marca la línea cuando el flete está vencido", () => {
    const input = baseInput();
    input.freight.quotedDaysAgo = 40;
    const result = liquidate(input);

    expect(result.warnings.some((w) => w.code === "FREIGHT_STALE")).toBe(true);
    expect(line(result, "FREIGHT.OCEAN")!.status).toBe("VALOR_CON_ADVERTENCIA");
  });

  it("propaga el estado más severo al resultado", () => {
    const input = baseInput();
    input.destination = input.destination.map((r) =>
      r.code === "BROKERAGE" ? { ...r, confidence: "UNVERIFIED" as const } : r,
    );
    expect(liquidate(input).status).toBe("VALOR_CON_ADVERTENCIA");
  });
});

describe("costo de pasarela", () => {
  it("se calcula solo sobre el anticipo, nunca sobre el total", () => {
    const result = liquidate(baseInput());
    const payment = line(result, "COMMERCIAL.PAYMENT")!;
    const expected = Money.of(20_000_000, "COP").times(0.0265);

    expect(payment.amountCop.equals(expected)).toBe(true);
    // Sanity: cobrarlo sobre el total daría una cifra mucho mayor.
    expect(payment.amountCop.compare(result.totalCop.times(0.0265))).toBe(-1);
  });
});

describe("trazabilidad", () => {
  it("cada línea de tributo cita su base y su norma", () => {
    const input = baseInput();
    input.tariff.dutyRate = 0.4;
    const result = liquidate(input);

    for (const code of ["TAX.ARANCEL", "TAX.IVA"]) {
      const item = line(result, code)!;
      expect(item.baseKind).toBeDefined();
      expect(item.baseAmountCop).toBeDefined();
      expect(item.rateApplied).toBeDefined();
      expect(item.legalBasis).toBeTruthy();
      expect(item.appliedRuleId).toBe("rule-bev");
    }
  });

  it("ninguna línea sale sin estado de resolución", () => {
    for (const item of liquidate(baseInput()).lineItems) {
      expect(["VALOR", "VALOR_CON_ADVERTENCIA", "NO_COTIZABLE"]).toContain(item.status);
    }
  });
});
