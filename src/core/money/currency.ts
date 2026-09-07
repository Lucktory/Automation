/**
 * Currency definitions.
 *
 * `exponent` is the number of decimal places the currency is quoted in, which
 * determines the size of a minor unit. COP is quoted without decimals in
 * practice — nobody prices a car at 185.400.000,37 — so its minor unit is the
 * peso itself. USD and EUR use cents.
 */

export const CURRENCIES = {
  COP: { code: "COP", exponent: 0, symbol: "$" },
  USD: { code: "USD", exponent: 2, symbol: "US$" },
  EUR: { code: "EUR", exponent: 2, symbol: "€" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export interface CurrencyDefinition {
  readonly code: CurrencyCode;
  readonly exponent: number;
  readonly symbol: string;
}

export function currencyOf(code: CurrencyCode): CurrencyDefinition {
  return CURRENCIES[code];
}

/** 10 ** exponent, as a bigint, for converting between major and minor units. */
export function minorUnitScale(code: CurrencyCode): bigint {
  return 10n ** BigInt(CURRENCIES[code].exponent);
}
