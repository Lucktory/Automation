/**
 * Emite cotizaciones de demostración por el camino REAL.
 *
 * Importa: no inserta filas a mano. Llama a `saveQuote`, que liquida con el
 * motor, arma la instantánea y la escribe en una transacción. Así las
 * cotizaciones que el cliente ve en /admin/cotizaciones —y los PDF que puede
 * abrir desde ahí— son idénticas a las que produciría un usuario, con sus
 * etiquetas traducidas de verdad y no con códigos de etapa.
 *
 * Borra primero las cotizaciones de prueba anteriores, para que la lista no se
 * llene de repeticiones cada vez que se corre.
 *
 *   npx tsx scripts/seed-quotes.ts
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { liquidate } from "../src/modules/pricing";
import { assembleInput, saveQuote, type LineLabeller } from "../src/modules/quoting";
import { createQuotingRepositories } from "../src/modules/quoting/infra/prisma-quoting-repositories";
import { createQuoteRepository } from "../src/modules/quoting/infra/prisma-quote-repository";
import { PrismaParameterSetRepository } from "../src/modules/parameters/infra/prisma-repositories";
import { messages } from "../src/messages";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

/** Resuelve una ruta con puntos dentro del catálogo, o `null`. */
function lookup(locale: "es" | "en", path: string): string | null {
  let node: unknown = messages[locale];
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) return null;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : null;
}

/**
 * El mismo etiquetador que usa la acción de servidor: texto real en los dos
 * idiomas, congelado en la instantánea al emitir.
 */
const label: LineLabeller = (item) => {
  const noteEs = lookup("es", `pricing.notes.${item.code}`) ?? item.legalBasis ?? null;
  const noteEn = lookup("en", `pricing.notes.${item.code}`) ?? item.legalBasis ?? null;
  return {
    label: {
      es: lookup("es", `pricing.stages.${item.code}`) ?? item.code,
      en: lookup("en", `pricing.stages.${item.code}`) ?? item.code,
    },
    note: noteEs === null && noteEn === null ? null : { es: noteEs ?? "", en: noteEn ?? "" },
  };
};

/** Cuántas unidades comparten contenedor en cada cotización de ejemplo. */
const SCENARIOS = [
  { units: 3, locale: "es" },
  { units: 1, locale: "es" },
  { units: 3, locale: "en" },
  { units: 2, locale: "es" },
] as const;

async function main() {
  const repos = createQuotingRepositories(prisma);
  const quotes = createQuoteRepository(prisma);
  const sets = new PrismaParameterSetRepository(prisma);
  const now = new Date();

  const activeSet = await sets.active(now);
  if (!activeSet) throw new Error("No hay conjunto de parámetros activo.");

  // Limpieza: las cotizaciones emitidas quedan congeladas por el disparador, así
  // que primero se devuelven a BORRADOR y luego se borran.
  const existing = await prisma.quote.findMany({ select: { id: true } });
  if (existing.length > 0) {
    const ids = existing.map((row) => row.id);
    await prisma.quote.updateMany({ where: { id: { in: ids } }, data: { status: "DRAFT" } });
    await prisma.quote.deleteMany({ where: { id: { in: ids } } });
    await prisma.quoteCounter.deleteMany({});
    console.log(`  limpiadas ${ids.length} cotizaciones anteriores`);
  }

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, name: true },
    take: SCENARIOS.length,
  });

  const vehicles = await repos.vehicles.publishedForQuote(SCENARIOS.length);
  const ports = await repos.ports.all();
  const destinations = ports.filter((port) => port.isDestination);

  const deps = {
    repos,
    quotes,
    parameterSetById: (id: string) => sets.byId(id),
    activeParameterSet: (on: Date) => sets.active(on),
    label,
    now: () => new Date(),
  };

  let issued = 0;
  for (const [index, scenario] of SCENARIOS.entries()) {
    const vehicle = vehicles[index % vehicles.length];
    if (!vehicle?.originPortId) continue;

    // Se alternan los puertos de entrada para que la lista no se vea clonada.
    const port = destinations[index % destinations.length];
    if (!port) continue;

    const modes = await repos.freight.modesForRoute(
      activeSet.id,
      vehicle.originPortId,
      port.id,
      now,
    );
    if (modes.length === 0) continue;

    const simulation = {
      vehicleId: vehicle.id,
      destinationPortId: port.id,
      ...(modes[0] ? { mode: modes[0] } : {}),
      unitsInContainer: scenario.units,
      commercialMethod: "BY_CIF_VALUE" as const,
      taxableBaseMethod: "BY_FOB_VALUE" as const,
      addOnCodes: [] as string[],
      importerIsEndConsumer: true,
      hasOriginCertificate: false,
    };

    const input = await assembleInput(repos, activeSet, { ...simulation, on: now });
    const expected = liquidate(input).totalCop.toJSON().minor;
    const customer = customers[index % Math.max(1, customers.length)];

    const saved = await saveQuote(deps, {
      simulation,
      parameterSetId: activeSet.id,
      parameterSetVersion: activeSet.version,
      expectedTotalCopMinor: expected,
      locale: scenario.locale,
      customerId: customer?.id ?? null,
      createdById: null,
    });

    if (!saved.ok) {
      console.log(`  —  ${vehicle.label}: ${saved.reason}`);
      continue;
    }

    issued += 1;
    const cop = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
    console.log(
      `  ok ${saved.quote.reference}  ${vehicle.label.padEnd(34)} ` +
        `${scenario.units}u · ${port.name.padEnd(13)} ${cop.format(Number(expected))} COP`,
    );
  }

  // Una enviada y otra aceptada: la lista del back-office necesita más de un
  // estado para que las píldoras signifiquen algo.
  const all = await prisma.quote.findMany({ orderBy: { sequence: "asc" }, select: { id: true } });
  if (all[1]) await prisma.quote.update({ where: { id: all[1].id }, data: { status: "SENT", sentAt: new Date() } });
  if (all[2]) {
    await prisma.quote.update({ where: { id: all[2].id }, data: { status: "SENT", sentAt: new Date() } });
    await prisma.quote.update({ where: { id: all[2].id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
  }

  console.log(`\n${issued} cotizaciones emitidas.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
