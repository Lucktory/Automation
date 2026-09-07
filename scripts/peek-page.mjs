/**
 * Lee una página del back-office como TEXTO, con la sesión iniciada.
 *
 * Un `curl` a /es/admin devuelve la redirección al login, así que no sirve para
 * comprobar qué cifras salieron impresas. Esto inicia sesión igual que el humo
 * de páginas y escupe el texto plano de la página, que es lo que hace falta
 * para verificar que una tabla trae filas y que un conteo no es cero.
 *
 *   node scripts/peek-page.mjs /es/admin
 *   node scripts/peek-page.mjs /en/admin/clientes
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "admin@automocion.os";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "Automocion2026!";

const target = process.argv[2];
if (!target) {
  console.error("Uso: node scripts/peek-page.mjs /es/admin");
  process.exit(1);
}

function cookiesFrom(response, jar) {
  for (const entry of response.headers.getSetCookie?.() ?? []) {
    const [pair] = entry.split(";");
    if (!pair) continue;
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1));
  }
}

const jarHeader = (jar) => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

async function login() {
  const jar = new Map();
  const csrfResponse = await fetch(`${BASE}/api/auth/csrf`);
  cookiesFrom(csrfResponse, jar);
  const { csrfToken } = await csrfResponse.json();

  const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: jarHeader(jar),
    },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD }),
    redirect: "manual",
  });
  cookiesFrom(response, jar);
  return jar;
}

const jar = await login();
const response = await fetch(`${BASE}${target}`, { headers: { cookie: jarHeader(jar) } });
const html = await response.text();

// Los <script> traen el payload serializado de React: duplicaría todo el texto.
const text = html
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<style[\s\S]*?<\/style>/g, "")
  .replace(/<[^>]+>/g, "\n")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .join("\n");

console.log(`HTTP ${response.status}  ${target}\n${"-".repeat(60)}`);
console.log(text);
