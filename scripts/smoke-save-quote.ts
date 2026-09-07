/**
 * Humo de extremo a extremo: emitir una cotización real contra Neon.
 *
 * Comprueba lo que ninguna prueba unitaria puede: que el consecutivo se asigne
 * de verdad, que la transacción escriba cabecera + vehículos + líneas, que el
 * disparador congele la fila al enviarla, y que dos guardados SIMULTÁNEOS no se
 * pisen el número.
 *
 *   npx tsx scripts/smoke-save-quote.ts
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { liquidate } from "../src/modules/pricing";
import { createQuotingRepositories } from "../src/modules/quoting/infra/prisma-quoting-repositories";
import { createQuoteRepository } from "../src/modules/quoting/infra/prisma-quote-repository";
import { assembleInput, saveQuote, type LineLabeller } from "../src/modules/quoting";
import { PrismaParameterSetRepository } from "../src/modules/parameters/infra/prisma-repositories";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const label: LineLabeller = (item) => ({
  label: { es: `ES ${item.code}`, en: `EN ${item.code}` },
  note: item.legalBasis ? { es: item.legalBasis, en: item.legalBasis } : null,
});

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

async function main() {
  const repos = createQuotingRepositories(prisma);
  const quotes = createQuoteRepository(prisma);
  const sets = new PrismaParameterSetRepository(prisma);
  const now = new Date();

  const activeSet = await sets.active(now);
  if (!activeSet) throw new Error("No hay conjunto activo. Ejecuta la siembra.");

  const vehicles = await repos.vehicles.publishedForQuote(5);
  const ports = await repos.ports.all();
  const vehicle = vehicles[0]!;
  const port = ports.find((p) => p.isDestination)!;
  const modes = vehicle.originPortId
    ? await repos.freight.modesForRoute(activeSet.id, vehicle.originPortId, port.id, now)
    : [];

  const simulation = {
    vehicleId: vehicle.id,
    destinationPortId: port.id,
    ...(modes[0] ? { mode: modes[0] } : {}),
    unitsInContainer: 3,
    commercialMethod: "BY_CIF_VALUE" as const,
    taxableBaseMethod: "BY_FOB_VALUE" as const,
    addOnCodes: [] as string[],
    importerIsEndConsumer: true,
    hasOriginCertificate: false,
  };

  const input = await assembleInput(repos, activeSet, { ...simulation, on: now });
  const expected = liquidate(input).totalCop.toJSON().minor;

  const deps = {
    repos,
    quotes,
    parameterSetById: (id: string) => sets.byId(id),
    activeParameterSet: (on: Date) => sets.active(on),
    label,
    now: () => new Date(),
  };

  const base = {
    simulation,
    parameterSetId: activeSet.id,
    parameterSetVersion: activeSet.version,
    expectedTotalCopMinor: expected,
    locale: "es",
    customerId: null,
    createdById: null,
  };

  console.log(`\nVehículo: ${vehicle.label} · total esperado ${expected} COP\n`);

  // --- 1 · Emisión ---------------------------------------------------------
  const first = await saveQuote(deps, base);
  check("emite una cotización", first.ok, first.ok ? first.quote.reference : String(first.reason));
  if (!first.ok) throw new Error("no se pudo emitir");

  const row = await prisma.quote.findUniqueOrThrow({
    where: { id: first.quote.id },
    include: { lineItems: true, vehicles: true },
  });

  check("escribe las líneas", row.lineItems.length > 0, `${row.lineItems.length} líneas`);
  check("escribe el vehículo", row.vehicles.length === 1);
  check("guarda la instantánea", row.snapshot !== null);
  check("guarda las dos TRM", row.trmFiscal !== null && Number(row.trmCommercial) > 0);
  check(
    "el total coincide con el motor",
    String(BigInt(row.totalCop.toFixed(0))) === expected,
    `${row.totalCop.toFixed(0)} vs ${expected}`,
  );
  check("deriva la vigencia del flete", row.validUntil !== null, String(row.validUntil));
  check(
    "numera COT-AAAA-NNNN",
    /^COT-\d{4}-\d{4}$/.test(row.reference),
    row.reference,
  );

  // --- 2 · Rechazo de un total que no coincide ----------------------------
  const stale = await saveQuote(deps, { ...base, expectedTotalCopMinor: "1" });
  check(
    "rechaza un total que el cliente no vio",
    !stale.ok && stale.reason === "PARAMETERS_CHANGED",
    stale.ok ? "aceptó" : stale.reason,
  );

  // --- 3 · Inmutabilidad tras enviar --------------------------------------
  await prisma.quote.update({ where: { id: row.id }, data: { status: "SENT" } });
  let blocked = false;
  try {
    await prisma.quote.update({ where: { id: row.id }, data: { totalCop: 1 } });
  } catch {
    blocked = true;
  }
  check("congela las cifras al enviar", blocked);

  let trackingOk = true;
  try {
    await prisma.quote.update({ where: { id: row.id }, data: { viewedAt: new Date() } });
  } catch {
    trackingOk = false;
  }
  check("permite seguir el ciclo de vida", trackingOk);

  // --- 4 · Dos guardados simultáneos --------------------------------------
  const pair = await Promise.all([saveQuote(deps, base), saveQuote(deps, base)]);
  const refs = pair.map((r) => (r.ok ? r.quote.reference : `ERR:${r.reason}`));
  check("dos guardados simultáneos no colisionan", refs[0] !== refs[1], refs.join(" / "));
  check("ambos se emiten", pair.every((r) => r.ok), refs.join(" / "));

  // --- Limpieza ------------------------------------------------------------
  const ids = [row.id, ...pair.flatMap((r) => (r.ok ? [r.quote.id] : []))];
  await prisma.quote.updateMany({ where: { id: { in: ids } }, data: { status: "DRAFT" } });
  await prisma.quote.deleteMany({ where: { id: { in: ids } } });

  // El contador NO se borra. Solo avanza. Borrarlo hacía que la siguiente
  // cotización volviera a COT-AAAA-0001 y chocara con las que ya existían —
  // exactamente el 23505 que el índice único está ahí para impedir. Un
  // consecutivo con huecos es normal; uno que se reinicia, no.

  console.log(
    `\n${failures === 0 ? "TODO OK" : `${failures} FALLO(S)`} — quedan ${await prisma.quote.count()} cotizaciones\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
