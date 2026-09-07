/**
 * Humo del PDF: emite una cotización real y pide su propuesta al servidor.
 *
 * Comprueba lo único que importa del documento: que se genere de verdad, que
 * sea un PDF válido, que tenga las dos páginas y que salga en los dos idiomas
 * desde la MISMA instantánea.
 *
 *   npx tsx scripts/smoke-pdf.ts [baseUrl]
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { liquidate } from "../src/modules/pricing";
import { assembleInput, saveQuote, type LineLabeller } from "../src/modules/quoting";
import { createQuotingRepositories } from "../src/modules/quoting/infra/prisma-quoting-repositories";
import { createQuoteRepository } from "../src/modules/quoting/infra/prisma-quote-repository";
import { PrismaParameterSetRepository } from "../src/modules/parameters/infra/prisma-repositories";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const BASE = process.argv[2] ?? "http://localhost:3000";
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const label: LineLabeller = (item) => ({
  label: { es: `ES ${item.code}`, en: `EN ${item.code}` },
  note: item.legalBasis ? { es: item.legalBasis, en: item.legalBasis } : null,
});

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

async function main() {
  const repos = createQuotingRepositories(prisma);
  const quotes = createQuoteRepository(prisma);
  const sets = new PrismaParameterSetRepository(prisma);
  const now = new Date();

  const activeSet = await sets.active(now);
  if (!activeSet) throw new Error("No hay conjunto activo.");

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

  const saved = await saveQuote(
    {
      repos,
      quotes,
      parameterSetById: (id: string) => sets.byId(id),
      activeParameterSet: (on: Date) => sets.active(on),
      label,
      now: () => new Date(),
    },
    {
      simulation,
      parameterSetId: activeSet.id,
      parameterSetVersion: activeSet.version,
      expectedTotalCopMinor: expected,
      locale: "es",
      customerId: null,
      createdById: null,
    },
  );

  if (!saved.ok) throw new Error(`No se pudo emitir: ${saved.reason}`);
  console.log(`\nCotización ${saved.quote.reference} · ${vehicle.label}\n`);

  for (const locale of ["es", "en"]) {
    const url = `${BASE}/api/cotizaciones/${saved.quote.id}/pdf?locale=${locale}`;
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());

    check(
      `[${locale}] responde 200 con content-type de PDF`,
      response.ok && response.headers.get("content-type") === "application/pdf",
      `${response.status} ${response.headers.get("content-type")}`,
    );

    const header = buffer.subarray(0, 5).toString("latin1");
    check(`[${locale}] el archivo es un PDF válido`, header === "%PDF-", header);
    check(`[${locale}] pesa algo razonable`, buffer.length > 3000, `${buffer.length} bytes`);

    // El contador de páginas del PDF: /Type /Page (sin la s de /Pages).
    const pages = (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    // El diseño pide portada + desglose. Un desglose largo puede continuar en
    // una tercera página; lo que no puede es faltar la segunda.
    check(`[${locale}] tiene la portada y el desglose`, pages >= 2, `${pages} páginas`);
    check(`[${locale}] cabe en dos páginas`, pages === 2, `${pages} páginas`);

    const out = `.next/propuesta-${saved.quote.reference}-${locale}.pdf`;
    writeFileSync(out, buffer);
    console.log(`       guardado en ${out}`);
  }

  console.log(
    `\n${failures === 0 ? "PDF OK" : `${failures} FALLO(S)`} — la cotización ${saved.quote.reference} queda emitida para inspección.\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
