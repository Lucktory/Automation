import type { Money } from "@/core/money";
import { currencyOf } from "@/core/money";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";

/**
 * Locale-aware formatting. `Intl` only — never manual string work.
 *
 * THE RULE THAT MATTERS: the currency never changes with the locale. An
 * English-speaking buyer importing into Colombia still pays COP. The locale
 * decides the FORMAT, not the money. `Money` carries its own currency and this
 * function only decides presentation.
 *
 *   es-CO → "COP $ 185.400.000"   en-US → "COP 185,400,000"
 */
export function formatMoney(money: Money, locale: Locale): string {
  const { code, exponent } = currencyOf(money.currency);

  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: code,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
    currencyDisplay: "code",
  }).format(money.toNumber());
}

/** Bare number, no currency symbol — for table cells that carry a unit header. */
export function formatAmount(money: Money, locale: Locale): string {
  const { exponent } = currencyOf(money.currency);

  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(money.toNumber());
}

/**
 * Una TASA DE CAMBIO no es dinero y no se formatea como tal.
 *
 * El peso colombiano tiene exponente 0, así que pasar la TRM por `formatMoney`
 * la redondearía de 3.126,08 a 3.126 y la insignia mostraría un valor que no
 * es el que se usó para liquidar.
 */
export function formatRate(
  value: number,
  locale: Locale,
  fractionDigits = 2,
): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(
  rate: number,
  locale: Locale,
  fractionDigits = 1,
): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }).format(rate);
}

export function formatDate(
  date: Date,
  locale: Locale,
  style: "long" | "short" = "long",
): string {
  const options: Intl.DateTimeFormatOptions =
    style === "long"
      ? { day: "numeric", month: "long", year: "numeric" }
      : { day: "2-digit", month: "2-digit", year: "numeric" };

  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    ...options,
    timeZone: "America/Bogota",
  }).format(date);
}

/**
 * Una cifra grande de pesos, resumida para una tarjeta de panel.
 *
 * Los paneles enseñan totales de miles de millones y el peso exacto no aporta
 * nada ahí: nadie decide en función del último dígito de una cartera. Lo que sí
 * estorba es un decimal de más — «COP $ 1.680,2 M» se lee peor que
 * «COP $ 1.680 M» y hace creer que la precisión importa.
 *
 * La decisión NO puede tomarse mirando el número crudo, porque cada idioma
 * cambia de unidad en un punto distinto: el español mantiene «M» hasta el
 * billón, así que mil millones se escriben «1.680 M», mientras el inglés salta a
 * «B» y los escribe «1.7B». Con una regla basada en el valor, la misma cifra
 * salía «1680,2 M» en una lengua y «2B» —redondeada hasta perder el sentido— en
 * la otra.
 *
 * Así que se mira lo que se va a IMPRIMIR: si la parte entera ya tiene tres
 * dígitos o más, el decimal es ruido y se quita; si no, se conserva porque ahí
 * sí distingue «726,4 M» de «726 M».
 *
 * Vive aquí y no en cada pantalla para que el panel de control y la cartera de
 * clientes no acaben resumiendo la misma cifra de dos maneras distintas.
 */
const COMPACT_INTEGER_DIGITS_MAX = 3;

export function formatCompactCop(value: number, locale: Locale): string {
  const options: Intl.NumberFormatOptions = {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  };

  const parts = new Intl.NumberFormat(INTL_LOCALE[locale], options).formatToParts(value);
  const integerDigits = parts
    .filter((part) => part.type === "integer")
    .reduce((count, part) => count + part.value.length, 0);

  const formatted =
    integerDigits >= COMPACT_INTEGER_DIGITS_MAX
      ? new Intl.NumberFormat(INTL_LOCALE[locale], {
          ...options,
          maximumFractionDigits: 0,
        }).format(value)
      : parts.map((part) => part.value).join("");

  return `COP $ ${formatted}`;
}
