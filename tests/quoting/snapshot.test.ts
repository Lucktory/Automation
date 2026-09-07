import { describe, expect, it } from "vitest";
import { Money } from "@/core/money";
import { liquidate } from "@/modules/pricing";
import {
  assertSnapshotBalances,
  buildSnapshot,
  SNAPSHOT_VERSION,
  SnapshotImbalanceError,
  quoteValidity,
  type LineLabeller,
} from "@/modules/quoting";
import { baseInput } from "../pricing/fixtures";

/**
 * La instantánea es el documento que obliga a la empresa. Estas pruebas
 * defienden tres cosas: que el dinero sobrevive al viaje a JSON sin perder un
 * peso, que las líneas siguen sumando el total, y que la vigencia sale del dato
 * y no de un número inventado.
 */

const label: LineLabeller = (item) => ({
  label: { es: `es:${item.code}`, en: `en:${item.code}` },
  note: item.legalBasis ? { es: item.legalBasis, en: item.legalBasis } : null,
});

const VEHICLE = {
  id: "veh-1",
  description: "BYD Seal Excellence AWD",
  hsCode: "8703801000",
  powertrain: "BEV",
  originCountry: "CN",
  modelYear: 2026,
  containerShare: 3,
};

function snapshotOf(input = baseInput()) {
  const result = liquidate(input);
  return {
    result,
    snapshot: buildSnapshot({
      input,
      result,
      parameterSet: { id: "set-1", version: 7 },
      issuedAt: new Date("2026-09-06T15:00:00Z"),
      label,
      vehicle: VEHICLE,
    }),
  };
}

describe("buildSnapshot", () => {
  it("stamps the format version so later field additions do not break old quotes", () => {
    const { snapshot } = snapshotOf();
    expect(snapshot.version).toBe(SNAPSHOT_VERSION);
  });

  it("records which parameter set produced the figures", () => {
    const { snapshot } = snapshotOf();
    expect(snapshot.parameterSet).toEqual({ id: "set-1", version: 7 });
  });

  it("survives a JSON round trip with every peso intact", () => {
    const { result, snapshot } = snapshotOf();

    // El viaje real: se guarda como jsonb y se lee de vuelta.
    const revived = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;

    expect(Money.fromJSON(revived.result.totalCop).equals(result.totalCop)).toBe(true);
    expect(Money.fromJSON(revived.result.taxesCop).equals(result.taxesCop)).toBe(true);
    expect(Money.fromJSON(revived.result.cifUsd).equals(result.cifUsd)).toBe(true);

    for (const [index, line] of revived.result.lineItems.entries()) {
      const original = result.lineItems[index]!;
      expect(Money.fromJSON(line.amountCop).equals(original.amountCop)).toBe(true);
    }
  });

  it("keeps money as minor units and not as a float", () => {
    const { snapshot } = snapshotOf();
    // Un `number` habría llegado aquí; un entero en unidades mínimas llega como
    // cadena, que es lo que hace exacta la reconstrucción.
    expect(typeof snapshot.result.totalCop.minor).toBe("string");
    expect(snapshot.result.totalCop.currency).toBe("COP");
  });

  it("stores labels in both languages already resolved, not i18n keys", () => {
    const { snapshot } = snapshotOf();
    const tax = snapshot.result.lineItems.find((l) => l.code === "TAX.IVA");
    expect(tax?.label.es).toBe("es:TAX.IVA");
    expect(tax?.label.en).toBe("en:TAX.IVA");
  });

  it("carries each line's own legal basis, because the rule may later be deleted", () => {
    const { snapshot } = snapshotOf();
    const withBasis = snapshot.result.lineItems.filter((l) => l.legalBasis !== null);
    expect(withBasis.length).toBeGreaterThan(0);
  });

  it("preserves the freight proration residue", () => {
    const { result, snapshot } = snapshotOf();
    expect(
      Money.fromJSON(snapshot.result.freightProration.residue).equals(
        result.freightProration.residue,
      ),
    ).toBe(true);
    expect(snapshot.result.freightProration.rows).toHaveLength(
      result.freightProration.rows.length,
    );
  });

  it("keeps the input so the calculation can be re-audited later", () => {
    const { snapshot } = snapshotOf();
    expect(snapshot.input.tariff.ruleId).toBe("rule-bev");
    expect(snapshot.input.fx.trmFiscal).toBeGreaterThan(0);
  });
});

describe("assertSnapshotBalances", () => {
  it("accepts a snapshot whose lines sum to its total", () => {
    const { snapshot } = snapshotOf();
    expect(() => assertSnapshotBalances(snapshot)).not.toThrow();
  });

  it("refuses a snapshot whose total was tampered with", () => {
    const { snapshot } = snapshotOf();
    const tampered = {
      ...snapshot,
      result: {
        ...snapshot.result,
        totalCop: { minor: "1", currency: "COP" as const },
      },
    };
    expect(() => assertSnapshotBalances(tampered)).toThrow(SnapshotImbalanceError);
  });

  it("refuses a snapshot that lost a line", () => {
    const { snapshot } = snapshotOf();
    const short = {
      ...snapshot,
      result: {
        ...snapshot.result,
        lineItems: snapshot.result.lineItems.slice(0, -1),
      },
    };
    expect(() => assertSnapshotBalances(short)).toThrow(SnapshotImbalanceError);
  });

  it("ignores subtotal lines, which would otherwise be double counted", () => {
    const { snapshot } = snapshotOf();
    const subtotals = snapshot.result.lineItems.filter((l) => l.isSubtotal);
    // Si el escenario base no tuviera subtotales la prueba no probaría nada.
    expect(subtotals.length).toBeGreaterThan(0);
    expect(() => assertSnapshotBalances(snapshot)).not.toThrow();
  });
});

describe("quoteValidity", () => {
  const issuedAt = new Date("2026-09-06T15:00:00Z");

  it("expires when the freight rate expires, not on a fixed calendar", () => {
    const input = baseInput();
    // La tarifa del escenario base se verificó hace 4 días y vence a los 21.
    const validity = quoteValidity(input, issuedAt);
    expect(validity.days).toBe(17);
    expect(validity.drivenBy).toBe("FREIGHT_RATE_STALENESS");
    expect(validity.bornStale).toBe(false);
  });

  it("grants zero days when the freight rate is already stale", () => {
    const input = baseInput();
    input.freight.quotedDaysAgo = 30;
    const validity = quoteValidity(input, issuedAt);
    expect(validity.days).toBe(0);
    expect(validity.bornStale).toBe(true);
    expect(validity.validUntil.getTime()).toBe(issuedAt.getTime());
  });

  it("grants zero days rather than inventing one when freshness is unknown", () => {
    const input = baseInput();
    delete (input.freight as { quotedDaysAgo?: number }).quotedDaysAgo;
    expect(quoteValidity(input, issuedAt).days).toBe(0);
  });

  it("never grants a negative window", () => {
    const input = baseInput();
    input.freight.quotedDaysAgo = 999;
    expect(quoteValidity(input, issuedAt).days).toBe(0);
  });
});
