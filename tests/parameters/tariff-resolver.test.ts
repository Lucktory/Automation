import { describe, expect, it } from "vitest";
import { resolveTariff, type TariffRuleCandidate } from "@/modules/parameters";
import { TariffRuleNotFoundError } from "@/modules/pricing";

const BASE: Omit<TariffRuleCandidate, "id" | "originCountry" | "powertrain" | "dutyRate"> = {
  hsCode: "8703231090",
  vatRate: 0.19,
  exciseRate: 0.08,
  dutyBase: "CIF",
  vatBase: "CIF_PLUS_ARANCEL",
  exciseBase: "TOTAL_VALUE_EXCL_IVA",
  exciseThresholdFobUsd: 30_000,
  exciseRateAboveThreshold: 0.16,
  exciseAppliesOnImport: true,
  requiresOriginCertificate: false,
  legalBasis: "Dto 1432 de 2025 art. 1",
  confidence: "VERIFIED",
  verifiedAt: new Date("2026-09-01"),
  staleAfterDays: 90,
  validFrom: new Date("2026-01-10"),
  validTo: null,
};

const rule = (over: Partial<TariffRuleCandidate>): TariffRuleCandidate => ({
  ...BASE,
  id: "r",
  originCountry: null,
  powertrain: null,
  dutyRate: 0.4,
  ...over,
});

const query = {
  hsCode: "8703231090",
  originCountry: "US",
  powertrain: "GASOLINE" as const,
  on: new Date("2026-09-05"),
};

describe("precedencia por especificidad", () => {
  it("el origen exacto le gana al comodín", () => {
    const result = resolveTariff(
      [
        rule({ id: "nmf", originCountry: null, dutyRate: 0.4 }),
        rule({ id: "tlc", originCountry: "US", dutyRate: 0 }),
      ],
      query,
    );
    expect(result.ruleId).toBe("tlc");
    expect(result.dutyRate).toBe(0);
  });

  it("la motorización exacta le gana al comodín", () => {
    const result = resolveTariff(
      [
        rule({ id: "any", powertrain: null }),
        rule({ id: "gas", powertrain: "GASOLINE" }),
      ],
      query,
    );
    expect(result.ruleId).toBe("gas");
  });

  it("a igual especificidad gana la vigencia más reciente", () => {
    const result = resolveTariff(
      [
        rule({ id: "vieja", originCountry: "US", validFrom: new Date("2024-01-01") }),
        rule({ id: "nueva", originCountry: "US", validFrom: new Date("2026-01-10") }),
      ],
      query,
    );
    expect(result.ruleId).toBe("nueva");
  });

  it("ignora reglas fuera de vigencia", () => {
    const result = resolveTariff(
      [
        rule({ id: "vencida", originCountry: "US", validTo: new Date("2026-01-01"), dutyRate: 0 }),
        rule({ id: "vigente", originCountry: null, dutyRate: 0.4 }),
      ],
      query,
    );
    expect(result.ruleId).toBe("vigente");
  });

  it("distingue país de ORIGEN de país de compra", () => {
    // Un Kia fabricado en Corea, comprado en EE.UU., no accede al TLC con EE.UU.
    const koreanBuiltBoughtInUs = { ...query, originCountry: "KR" };
    const result = resolveTariff(
      [
        rule({ id: "usa", originCountry: "US", dutyRate: 0 }),
        rule({ id: "nmf", originCountry: null, dutyRate: 0.4 }),
      ],
      koreanBuiltBoughtInUs,
    );
    expect(result.ruleId).toBe("nmf");
    expect(result.dutyRate).toBe(0.4);
  });
});

describe("la ausencia de regla no es una exención", () => {
  it("lanza en vez de asumir arancel cero", () => {
    expect(() => resolveTariff([], query)).toThrow(TariffRuleNotFoundError);
  });

  it("lanza cuando la subpartida no coincide", () => {
    expect(() =>
      resolveTariff([rule({ hsCode: "8703801000" })], query),
    ).toThrow(TariffRuleNotFoundError);
  });

  it("no resuelve por partida de 4 dígitos", () => {
    expect(() =>
      resolveTariff([rule({ hsCode: "8703" })], query),
    ).toThrow(TariffRuleNotFoundError);
  });
});

describe("confianza y frescura del dato", () => {
  it("una regla sin verificar no es cotizable en firme", () => {
    const result = resolveTariff([rule({ confidence: "UNVERIFIED" })], query);
    expect(result.status).toBe("NO_COTIZABLE");
    expect(result.warning).toBeTruthy();
  });

  it("una estimación cotiza con advertencia", () => {
    const result = resolveTariff([rule({ confidence: "ESTIMATED" })], query);
    expect(result.status).toBe("VALOR_CON_ADVERTENCIA");
  });

  it("una regla vencida cotiza con advertencia", () => {
    const result = resolveTariff(
      [rule({ verifiedAt: new Date("2026-01-01"), staleAfterDays: 90 })],
      query,
    );
    expect(result.status).toBe("VALOR_CON_ADVERTENCIA");
    expect(result.warning).toContain("no se verifica");
  });

  it("una regla verificada y fresca cotiza en firme", () => {
    expect(resolveTariff([rule({})], query).status).toBe("VALOR");
  });

  it("devuelve la norma para que el PDF pueda citarla", () => {
    expect(resolveTariff([rule({})], query).legalBasis).toBe("Dto 1432 de 2025 art. 1");
  });
});
