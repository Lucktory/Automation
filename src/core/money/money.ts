import Decimal from "decimal.js";
import { type CurrencyCode, currencyOf, minorUnitScale } from "./currency";

/**
 * Money — an immutable value object holding an integer count of minor units
 * plus its currency.
 *
 * WHY THIS EXISTS
 * ---------------
 * Floating point cannot represent money. `0.1 + 0.2 !== 0.3` is not a curiosity
 * here: this engine chains a dozen multiplications and additions across two
 * currencies before producing a figure a buyer will be asked to pay. Errors
 * compound, and a total that is one peso off is a total that visibly does not
 * add up — which destroys trust in every other number on the screen.
 *
 * So: amounts are bigint minor units, rates are Decimal, and raw `number`
 * arithmetic on currency is banned by lint.
 *
 * Mixing currencies throws. There is no implicit conversion; crossing from USD
 * to COP is an explicit step in the engine that records the TRM it used.
 */
export class Money {
  private constructor(
    readonly minor: bigint,
    readonly currency: CurrencyCode,
  ) {}

  // -- construction ---------------------------------------------------------

  /** From a major-unit amount: `Money.of(185_400_000, "COP")`. */
  static of(amount: number | string | Decimal, currency: CurrencyCode): Money {
    const scaled = new Decimal(amount instanceof Decimal ? amount : amount)
      .times(minorUnitScale(currency).toString())
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return new Money(BigInt(scaled.toFixed(0)), currency);
  }

  /** From an already-scaled minor-unit amount. */
  static fromMinor(minor: bigint | number, currency: CurrencyCode): Money {
    return new Money(BigInt(minor), currency);
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(0n, currency);
  }

  // -- arithmetic -----------------------------------------------------------

  plus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minor + other.minor, this.currency);
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minor - other.minor, this.currency);
  }

  /**
   * Multiply by a dimensionless rate (a tariff percentage, an FX rate, a
   * margin). Rounds half-up to the nearest minor unit.
   */
  times(rate: number | string | Decimal): Money {
    const product = new Decimal(this.minor.toString())
      .times(rate instanceof Decimal ? rate : rate)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return new Money(BigInt(product.toFixed(0)), this.currency);
  }

  /** Convert to another currency at an explicit rate. */
  convertTo(currency: CurrencyCode, rate: number | string | Decimal): Money {
    const fromScale = new Decimal(minorUnitScale(this.currency).toString());
    const toScale = new Decimal(minorUnitScale(currency).toString());
    const converted = new Decimal(this.minor.toString())
      .div(fromScale)
      .times(rate instanceof Decimal ? rate : rate)
      .times(toScale)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return new Money(BigInt(converted.toFixed(0)), currency);
  }

  static sum(items: readonly Money[], currency: CurrencyCode): Money {
    return items.reduce<Money>((acc, m) => acc.plus(m), Money.zero(currency));
  }

  // -- allocation -----------------------------------------------------------

  /**
   * Split this amount across `weights`, guaranteeing that the parts sum back to
   * EXACTLY this amount. This is the primitive behind container proration
   * (prorrateo): splitting one freight bill across the vehicles sharing a
   * container by value, weight or volume.
   *
   * Uses largest-remainder: each party gets the floor of its proportional
   * share, then the leftover minor units go one each to the parties with the
   * largest discarded fractions. Deterministic, and never off by a peso.
   *
   * Negative weights are rejected. All-zero weights fall back to an even split.
   */
  allocate(weights: readonly number[]): Money[] {
    if (weights.length === 0) {
      throw new RangeError("allocate() requires at least one weight");
    }
    if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
      throw new RangeError("allocate() weights must be finite and non-negative");
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight === 0) {
      return this.allocateEvenly(weights.length);
    }

    const negative = this.minor < 0n;
    const magnitude = negative ? -this.minor : this.minor;

    const shares: bigint[] = [];
    const remainders: { index: number; fraction: Decimal }[] = [];
    let distributed = 0n;

    weights.forEach((weight, index) => {
      const exact = new Decimal(magnitude.toString())
        .times(weight)
        .div(totalWeight);
      const floored = exact.floor();
      const share = BigInt(floored.toFixed(0));
      shares.push(share);
      distributed += share;
      remainders.push({ index, fraction: exact.minus(floored) });
    });

    let leftover = magnitude - distributed;

    // Largest discarded fraction first; ties broken by index for determinism.
    remainders.sort((a, b) => {
      const cmp = b.fraction.comparedTo(a.fraction);
      return cmp !== 0 ? cmp : a.index - b.index;
    });

    for (let i = 0; leftover > 0n; i = (i + 1) % remainders.length) {
      const target = remainders[i];
      if (target === undefined) break;
      shares[target.index] = (shares[target.index] ?? 0n) + 1n;
      leftover -= 1n;
    }

    return shares.map((s) => new Money(negative ? -s : s, this.currency));
  }

  /** Equal split, with the remainder distributed one minor unit at a time. */
  allocateEvenly(parts: number): Money[] {
    if (!Number.isInteger(parts) || parts < 1) {
      throw new RangeError("allocateEvenly() requires a positive integer");
    }
    return this.allocate(new Array<number>(parts).fill(1));
  }

  // -- comparison -----------------------------------------------------------

  equals(other: Money): boolean {
    return this.currency === other.currency && this.minor === other.minor;
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.minor < other.minor) return -1;
    if (this.minor > other.minor) return 1;
    return 0;
  }

  get isZero(): boolean {
    return this.minor === 0n;
  }

  get isNegative(): boolean {
    return this.minor < 0n;
  }

  // -- conversion out -------------------------------------------------------

  /** Major units as a Decimal. Use for display and serialization, not math. */
  toDecimal(): Decimal {
    return new Decimal(this.minor.toString()).div(
      minorUnitScale(this.currency).toString(),
    );
  }

  /** Plain major-unit number. Lossy for very large values — display only. */
  toNumber(): number {
    return this.toDecimal().toNumber();
  }

  /** Stable serialization for quote snapshots and API payloads. */
  toJSON(): { minor: string; currency: CurrencyCode } {
    return { minor: this.minor.toString(), currency: this.currency };
  }

  static fromJSON(value: { minor: string; currency: CurrencyCode }): Money {
    return new Money(BigInt(value.minor), value.currency);
  }

  toString(): string {
    return `${this.toDecimal().toFixed(currencyOf(this.currency).exponent)} ${this.currency}`;
  }

  // -- internals ------------------------------------------------------------

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new TypeError(
        `Cannot combine ${this.currency} with ${other.currency}. Convert explicitly with convertTo().`,
      );
    }
  }
}
