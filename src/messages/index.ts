import esCommon from "./es/common.json";
import esAdmin from "./es/admin.json";
import esAuth from "./es/auth.json";
import esPricing from "./es/pricing.json";
import esSite from "./es/site.json";

import enCommon from "./en/common.json";
import enAdmin from "./en/admin.json";
import enAuth from "./en/auth.json";
import enPricing from "./en/pricing.json";
import enSite from "./en/site.json";

/**
 * THE ONLY PLACE USER-FACING TEXT LIVES.
 *
 * Namespaces mirror the module map, so a module owns its copy the way it owns
 * its code. Static imports (rather than dynamic ones) give type safety and let
 * `npm run i18n:check` diff the key trees at build time — a key present in one
 * locale and missing in the other fails CI, which is the single check that
 * keeps the second locale from rotting as the product grows.
 */
export const messages = {
  es: {
    common: esCommon,
    admin: esAdmin,
    auth: esAuth,
    pricing: esPricing,
    site: esSite,
  },
  en: {
    common: enCommon,
    admin: enAdmin,
    auth: enAuth,
    pricing: enPricing,
    site: enSite,
  },
} as const;

export type Messages = (typeof messages)["es"];
