/**
 * Humo de páginas: comprueba que TODAS las rutas rendericen de verdad.
 *
 * Un 307 en /admin solo demuestra que la guarda funciona, no que la pantalla
 * exista: la redirección ocurre antes de renderizar. Por eso este script inicia
 * sesión y vuelve a pedir cada ruta con la cookie puesta.
 *
 * Además busca en el HTML las marcas de un fallo silencioso —la pantalla de
 * error de Next, o el centinela ⟨namespace.key⟩ que deja una traducción que
 * falta— porque las dos devuelven 200 y aun así arruinan la demostración.
 *
 *   node scripts/smoke-pages.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";
const EMAIL = "admin@automocion.os";
const PASSWORD = "Automocion2026!";

/**
 * Las rutas públicas llevan segmento TRADUCIDO (/es/catalogo vs /en/catalog),
 * así que no basta con anteponer el idioma: hay que probar la ruta real de cada
 * uno. Justo aquí es donde una traducción de ruta mal registrada se esconde.
 */
const PUBLIC_ROUTES = [
  { es: "/", en: "/" },
  { es: "/catalogo", en: "/catalog" },
  {
    es: "/catalogo/byd-seal-excellence-awd-2026",
    en: "/catalog/byd-seal-excellence-awd-2026",
  },
  { es: "/como-trabajamos", en: "/how-it-works" },
  { es: "/mapa-global", en: "/global-map" },
  { es: "/blog", en: "/blog" },
  { es: "/blog/buenaventura-o-cartagena", en: "/blog/buenaventura-o-cartagena" },
  { es: "/nosotros", en: "/about" },
  { es: "/contacto", en: "/contact" },
  { es: "/faq", en: "/faq" },
  { es: "/legal/habeas-data", en: "/legal/habeas-data" },
  { es: "/legal/terminos", en: "/legal/terminos" },
  { es: "/comparar", en: "/compare" },
  { es: "/checkout", en: "/checkout" },
  { es: "/simulador", en: "/import-calculator" },
  { es: "/login", en: "/login" },
  { es: "/registro", en: "/registro" },
];

const AUTHED_ROUTES = [
  "/portal",
  "/admin",
  "/admin/inventario",
  "/admin/parametros",
  "/admin/consolidacion",
  "/admin/cotizaciones",
  "/admin/pedidos",
  "/admin/clientes",
  "/admin/fuentes",
  "/admin/omnicanal",
  "/admin/social",
  "/admin/blog",
  "/admin/usuarios",
  "/admin/ajustes",
];

/** Señales de que la página devolvió 200 pero está rota. */
const BROKEN_MARKERS = [
  { needle: "⟨", why: "traducción faltante" },
  { needle: "Application error", why: "error de cliente" },
  { needle: "call-stack", why: "overlay de error de Next" },
  { needle: "Unhandled Runtime Error", why: "excepción en render" },
];

let failures = 0;

function cookiesFrom(response, jar) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const entry of raw) {
    const [pair] = entry.split(";");
    if (!pair) continue;
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1));
  }
}

const jarHeader = (jar) =>
  [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");

async function login() {
  const jar = new Map();

  const csrfResponse = await fetch(`${BASE}/api/auth/csrf`);
  cookiesFrom(csrfResponse, jar);
  const { csrfToken } = await csrfResponse.json();

  const body = new URLSearchParams({
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    callbackUrl: `${BASE}/es/admin`,
  });

  const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: jarHeader(jar),
    },
    body,
    redirect: "manual",
  });
  cookiesFrom(response, jar);

  const authed = [...jar.keys()].some((key) => key.includes("session-token"));
  console.log(authed ? "  sesión iniciada\n" : "  NO se pudo iniciar sesión\n");
  if (!authed) failures += 1;
  return jar;
}

async function check(path, jar, locale = "es") {
  const url = `${BASE}/${locale}${path === "/" ? "" : path}`;
  try {
    const response = await fetch(url, {
      headers: jar ? { cookie: jarHeader(jar) } : {},
      redirect: "follow",
    });
    const html = await response.text();

    const broken = BROKEN_MARKERS.find((marker) => html.includes(marker.needle));
    const ok = response.ok && !broken;
    if (!ok) failures += 1;

    const detail = !response.ok
      ? `HTTP ${response.status}`
      : broken
        ? broken.why
        : `${Math.round(html.length / 1024)} kB`;

    console.log(`  ${ok ? "ok  " : "FAIL"} ${`/${locale}${path}`.padEnd(48)} ${detail}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${`/${locale}${path}`.padEnd(48)} ${error.message}`);
  }
}

console.log(`\nPáginas públicas — ${BASE}\n`);
for (const route of PUBLIC_ROUTES) {
  await check(route.es, null, "es");
  await check(route.en, null, "en");
}

console.log("\nAutenticadas (rutas canónicas en ambos idiomas)\n");
const jar = await login();
for (const route of AUTHED_ROUTES) await check(route, jar, "es");
// El back-office conserva rutas en español a propósito, pero su INTERFAZ sí se
// traduce: se comprueban dos en inglés para que esa parte no se pudra sin ruido.
await check("/admin", jar, "en");
await check("/portal", jar, "en");

console.log(
  `\n${failures === 0 ? "TODAS LAS PÁGINAS RENDERIZAN" : `${failures} PÁGINA(S) CON PROBLEMAS`}\n`,
);
process.exitCode = failures === 0 ? 0 : 1;
