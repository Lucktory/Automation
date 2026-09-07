import { describe, expect, it } from "vitest";
import { Money } from "@/core/money";
import { liquidate, prorate, type ConsolidationUnit } from "@/modules/pricing";
import { baseInput } from "./fixtures";

const UNITS: ConsolidationUnit[] = [
  { reference: "A", fobUsd: 32_000, weightKg: 2185, cbm: 14.2 },
  { reference: "B", fobUsd: 28_000, weightKg: 1950, cbm: 15.8 },
  { reference: "C", fobUsd: 19_500, weightKg: 1965, cbm: 13.4 },
];

describe("prorrateo de contenedor", () => {
  const container = Money.of(4_850, "USD");

  it("reparte en partes iguales", () => {
    const result = prorate(Money.of(900, "USD"), UNITS, "EQUAL_SHARE");
    expect(result.rows.map((r) => r.allocated.toNumber())).toEqual([300, 300, 300]);
  });

  it("reparte por valor FOB proporcionalmente", () => {
    const result = prorate(container, UNITS, "BY_FOB_VALUE");
    expect(result.rows[0]!.allocated.compare(result.rows[1]!.allocated)).toBe(1);
    expect(result.rows[1]!.allocated.compare(result.rows[2]!.allocated)).toBe(1);
  });

  it("reparte por peso", () => {
    const result = prorate(container, UNITS, "BY_WEIGHT");
    // C pesa más que B, así que paga más pese a valer menos.
    expect(result.rows[2]!.allocated.compare(result.rows[1]!.allocated)).toBe(1);
  });

  it("reparte por volumen", () => {
    const result = prorate(container, UNITS, "BY_CBM");
    expect(result.rows[1]!.allocated.compare(result.rows[0]!.allocated)).toBe(1);
  });

  it("acepta participaciones manuales que suman 1", () => {
    const manual: ConsolidationUnit[] = [
      { ...UNITS[0]!, manualShare: 0.5 },
      { ...UNITS[1]!, manualShare: 0.3 },
      { ...UNITS[2]!, manualShare: 0.2 },
    ];
    const result = prorate(container, manual, "MANUAL");
    expect(result.rows[0]!.allocated.toNumber()).toBeCloseTo(2425, 2);
  });

  it("rechaza participaciones manuales que no suman 1", () => {
    const bad: ConsolidationUnit[] = [
      { ...UNITS[0]!, manualShare: 0.5 },
      { ...UNITS[1]!, manualShare: 0.3 },
      { ...UNITS[2]!, manualShare: 0.1 },
    ];
    expect(() => prorate(container, bad, "MANUAL")).toThrow(RangeError);
  });

  it("EXIGE que las partes sumen exactamente el total, en todos los métodos", () => {
    for (const method of ["EQUAL_SHARE", "BY_FOB_VALUE", "BY_CIF_VALUE", "BY_CBM", "BY_WEIGHT"] as const) {
      const result = prorate(container, UNITS, method);
      const sum = Money.sum(result.rows.map((r) => r.allocated), "USD");
      expect(sum.equals(container), `${method} no cuadra`).toBe(true);
    }
  });

  it("expone el residuo de redondeo en vez de esconderlo", () => {
    // 100 entre 3 no es exacto: el residuo debe ser visible.
    const result = prorate(Money.of(100, "COP"), UNITS, "EQUAL_SHARE");
    expect(result.residue.toNumber()).toBe(1);
    expect(result.rows.filter((r) => r.isResidueBearer)).toHaveLength(1);
  });

  it("no admite prorrateo por volumen para la base gravable", () => {
    // El tipo lo impide en compilación; en ejecución, el motor calcula la base
    // gravable con un método distinto del comercial.
    const result = liquidate(baseInput());
    expect(["BY_FOB_VALUE", "BY_WEIGHT"]).toContain(result.taxableBaseProration.method);
  });

  it("el reparto comercial y el de base gravable pueden diferir", () => {
    const input = baseInput();
    input.consolidation.commercialMethod = "BY_CBM";
    input.consolidation.taxableBaseMethod = "BY_WEIGHT";
    const result = liquidate(input);

    expect(result.freightProration.method).toBe("BY_CBM");
    expect(result.taxableBaseProration.method).toBe("BY_WEIGHT");
  });

  it("una sola unidad se lleva el contenedor completo", () => {
    const solo = prorate(container, [UNITS[0]!], "BY_FOB_VALUE");
    expect(solo.rows[0]!.allocated.equals(container)).toBe(true);
  });

  it("compartir contenedor abarata la unidad", () => {
    const alone = baseInput();
    alone.consolidation.units = [alone.consolidation.units[0]!];
    const shared = baseInput();

    expect(liquidate(shared).totalCop.compare(liquidate(alone).totalCop)).toBe(-1);
  });
});
