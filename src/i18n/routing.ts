import { defineRouting } from "next-intl/routing";

/**
 * Locale routing.
 *
 * Both locales are prefixed (`/es/...`, `/en/...`). An unprefixed default
 * creates duplicate-content ambiguity and makes the language switcher's return
 * path inconsistent — one rule, no exceptions, is worth three characters.
 *
 * Public marketing and shop routes carry TRANSLATED path segments because those
 * URLs are indexed and shared. Portal and admin routes keep canonical Spanish
 * paths: they sit behind auth, where a stable path is worth more than a
 * translated one.
 */
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
  pathnames: {
    "/": "/",

    // --- Shop (translated) --------------------------------------------------
    "/catalogo": { es: "/catalogo", en: "/catalog" },
    "/catalogo/[slug]": { es: "/catalogo/[slug]", en: "/catalog/[slug]" },
    "/comparar": { es: "/comparar", en: "/compare" },
    "/simulador": { es: "/simulador", en: "/import-calculator" },
    "/checkout": { es: "/checkout", en: "/checkout" },

    // --- Marketing (translated) ---------------------------------------------
    "/como-trabajamos": { es: "/como-trabajamos", en: "/how-it-works" },
    "/mapa-global": { es: "/mapa-global", en: "/global-map" },
    "/blog": { es: "/blog", en: "/blog" },
    "/blog/[slug]": { es: "/blog/[slug]", en: "/blog/[slug]" },
    "/nosotros": { es: "/nosotros", en: "/about" },
    "/contacto": { es: "/contacto", en: "/contact" },
    "/faq": { es: "/faq", en: "/faq" },
    "/legal/[slug]": { es: "/legal/[slug]", en: "/legal/[slug]" },

    // --- Auth, portal, admin (canonical in both locales) --------------------
    "/login": "/login",
    "/registro": "/registro",
    "/portal": "/portal",
    "/admin": "/admin",
    "/admin/parametros": "/admin/parametros",
    "/admin/inventario": "/admin/inventario",
    "/admin/consolidacion": "/admin/consolidacion",
    "/admin/cotizaciones": "/admin/cotizaciones",
    "/admin/pedidos": "/admin/pedidos",
    "/admin/clientes": "/admin/clientes",
    "/admin/fuentes": "/admin/fuentes",
    "/admin/omnicanal": "/admin/omnicanal",
    "/admin/social": "/admin/social",
    "/admin/blog": "/admin/blog",
    "/admin/usuarios": "/admin/usuarios",
    "/admin/ajustes": "/admin/ajustes",
  },
});

export type Locale = (typeof routing.locales)[number];
export const LOCALES = routing.locales;
export const DEFAULT_LOCALE = routing.defaultLocale;

/** Full ICU locales used for Intl formatting (dates, numbers, currency). */
export const INTL_LOCALE: Record<Locale, string> = {
  es: "es-CO",
  en: "en-US",
};

/** Fallback chain used when a translation is missing. Never render blank. */
export const FALLBACK_LOCALE: Record<Locale, Locale> = {
  es: "en",
  en: "es",
};
