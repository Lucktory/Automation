import { getRequestConfig } from "next-intl/server";
import { messages } from "@/messages";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./routing";

const BOGOTA = "America/Bogota";
const isProduction = process.env.NODE_ENV === "production";

function isSupported(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isSupported(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: messages[locale],
    formats: {
      number: {
        cop: { style: "currency", currency: "COP", maximumFractionDigits: 0 },
        usd: { style: "currency", currency: "USD", maximumFractionDigits: 0 },
        percent: { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 },
      },
      dateTime: {
        long: { day: "numeric", month: "long", year: "numeric" },
        short: { day: "2-digit", month: "2-digit", year: "numeric" },
      },
    },
    // Never render a raw key or a blank to a user. In development the sentinel
    // makes a missing key obvious; in production the parity check in CI means
    // this branch should be unreachable.
    onError: () => undefined,
    getMessageFallback: ({ key, namespace }) =>
      isProduction ? "" : `⟨${namespace}.${key}⟩`,
    timeZone: BOGOTA,
  };
});
