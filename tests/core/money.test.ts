import { describe, expect, it } from "vitest";
import { Money } from "@/core/money";

describe("Money construction", () => {
  it("scales major units to minor units by currency exponent", () => {
    expect(Money.of(185_400_000, "COP").minor).toBe(185_400_000n);
    expect(Money.of(42_500, "USD").minor).toBe(4_250_000n);
  });

  it("round-trips through JSON without loss", () => {
    const original = Money.of("185400000", "COP");
    expect(Money.fromJSON(original.toJSON()).equals(original)).toBe(true);
  });
});

describe("Money arithmetic", () => {
  it("refuses to mix currencies", () => {
    expect(() => Money.of(1, "COP").plus(Money.of(1, "USD"))).toThrow(TypeError);
  });

  it("converts at an explicit rate", () => {
    const usd = Money.of(1_000, "USD");
    const cop = usd.convertTo("COP", 4_105.2);
    expect(cop.currency).toBe("COP");
    expect(cop.minor).toBe(4_105_200n);
  });

  it("does not accumulate floating point error across a long chain", () => {
    // The classic float trap: 0.1 + 0.2 !== 0.3
    let total = Money.zero("USD");
    for (let i = 0; i < 1_000; i += 1) total = total.plus(Money.of("0.1", "USD"));
    expect(total.minor).toBe(10_000n); // exactly US$ 100.00
  });
});

describe("Money.allocate — proration", () => {
  it("splits evenly when weights are equal", () => {
    const parts = Money.of(900, "COP").allocate([1, 1, 1]);
    expect(parts.map((p) => p.minor)).toEqual([300n, 300n, 300n]);
  });

  it("conserves the total when the split is not clean", () => {
    const total = Money.of(100, "COP");
    const parts = total.allocate([1, 1, 1]);
    expect(parts.map((p) => p.minor)).toEqual([34n, 33n, 33n]);
    expect(Money.sum(parts, "COP").equals(total)).toBe(true);
  });

  it("allocates by CIF value", () => {
    // A US$ 4,850 container shared by three vehicles of differing value.
    const freight = Money.of(4_850, "USD");
    const parts = freight.allocate([32_000, 28_000, 19_500]);
    expect(Money.sum(parts, "USD").equals(freight)).toBe(true);
    expect(parts[0]!.compare(parts[1]!)).toBe(1);
    expect(parts[1]!.compare(parts[2]!)).toBe(1);
  });

  it("falls back to an even split when every weight is zero", () => {
    const parts = Money.of(10, "COP").allocate([0, 0, 0]);
    expect(Money.sum(parts, "COP").minor).toBe(10n);
  });

  it("rejects negative weights", () => {
    expect(() => Money.of(10, "COP").allocate([1, -1])).toThrow(RangeError);
  });

  it("handles negative amounts (credits) without losing a unit", () => {
    const credit = Money.of(-100, "COP");
    const parts = credit.allocate([1, 1, 1]);
    expect(Money.sum(parts, "COP").equals(credit)).toBe(true);
  });

  /**
   * The property that matters. If this ever fails, a quote's line items stop
   * summing to its total, and the operator loses confidence in every figure the
   * engine produces.
   */
  it("PROPERTY: allocated parts always sum to exactly the original", () => {
    let seed = 12345;
    const random = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };

    for (let trial = 0; trial < 2_000; trial += 1) {
      const amount = Money.fromMinor(BigInt(random(500_000_000)), "COP");
      const count = 1 + random(8);
      const weights = Array.from({ length: count }, () => random(10_000));
      const parts = amount.allocate(weights);

      expect(parts).toHaveLength(count);
      expect(Money.sum(parts, "COP").minor).toBe(amount.minor);
      expect(parts.every((p) => !p.isNegative)).toBe(true);
    }
  });
});
