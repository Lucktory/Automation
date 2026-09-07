/**
 * Calcula el costo puesto en Colombia de cada vehículo publicado y lo guarda.
 *
 * La vitrina no puede liquidar diez vehículos en cada visita —serían decenas de
 * consultas por página— así que el resultado se cachea en `Vehicle.estLandedCop`.
 * La cifra NO es vinculante: la vinculante vive en `Quote.calcSnapshot`, que se
 * congela al emitir. Esta solo ordena y muestra la vitrina.
 *
 * Se recalcula cuando cambian los parámetros, por eso queda como script y no
 * como un valor sembrado a mano: sembrar un precio a mano es exactamente el
 * tipo de cifra inventada que el cliente detecta.
 *
 *   npx tsx scripts/price-catalog.ts
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { liquidate } from "../src/modules/pricing";
import { assembleInput } from "../src/modules/quoting";
import { createQuotingRepositories } from "../src/modules/quoting/infra/prisma-quoting-repositories";
import { PrismaParameterSetRepository } from "../src/modules/parameters/infra/prisma-repositories";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

/** Escenario de vitrina: contenedor compartido entre tres, el caso habitual. */
const UNITS_PER_CONTAINER = 3;

async function main() {
  const repos = createQuotingRepositories(prisma);
  const sets = new PrismaParameterSetRepository(prisma);
  const now = new Date();

  const activeSet = await sets.active(now);
  if (!activeSet) throw new Error("No hay conjunto de parámetros activo.");

  const ports = await repos.ports.all();
  const vehicles = await repos.vehicles.publishedForQuote(200);

  let priced = 0;
  let skipped = 0;

  for (const vehicle of vehicles) {
    /**
     * El puerto de entrada más barato para ESE origen, no uno fijo: desde Asia
     * entra por Buenaventura y desde Europa por Cartagena, y forzar un único
     * puerto inventaría un flete que nadie pagaría.
     */
    const candidates = ports.filter((port) => port.isDestination);
    let best: { portId: string; totalCop: number } | null = null;

    for (const port of candidates) {
      try {
        const modes = vehicle.originPortId
          ? await repos.freight.modesForRoute(activeSet.id, vehicle.originPortId, port.id, now)
          : [];
        if (modes.length === 0) continue;

        const input = await assembleInput(repos, activeSet, {
          vehicleId: vehicle.id,
          destinationPortId: port.id,
          ...(modes[0] ? { mode: modes[0] } : {}),
          unitsInContainer: UNITS_PER_CONTAINER,
          commercialMethod: "BY_CIF_VALUE",
          taxableBaseMethod: "BY_FOB_VALUE",
          addOnCodes: [],
          importerIsEndConsumer: true,
          hasOriginCertificate: false,
          on: now,
        });

        const total = liquidate(input).totalCop.toNumber();
        if (!best || total < best.totalCop) best = { portId: port.id, totalCop: total };
      } catch {
        // Ruta sin tarifa o sin regla arancelaria: se prueba el siguiente puerto.
      }
    }

    if (!best) {
      skipped += 1;
      console.log(`  —  ${vehicle.label}: sin ruta cotizable`);
      continue;
    }

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        estLandedCop: best.totalCop,
        estLandedAt: now,
        estLandedParamSetId: activeSet.id,
      },
    });

    priced += 1;
    console.log(
      `  ok ${vehicle.label.padEnd(38)} ${new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: 0,
      }).format(best.totalCop)} COP`,
    );
  }

  console.log(`\n${priced} vehículos con precio, ${skipped} sin ruta.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
