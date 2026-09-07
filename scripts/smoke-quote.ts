import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

/**
 * Prueba de humo de la cadena completa: base de datos → ensamblaje → motor.
 *
 * Es lo que ninguna prueba con dobles alcanza: que los 94 aranceles sembrados,
 * las 7 tarifas de flete y los 11 costos de destino se traducen de verdad a una
 * cifra en pesos.
 *
 *   npx tsx scripts/smoke-quote.ts
 */

const { parametersDeps, quotingRepositories } = await import("../src/composition/container");
const { simulate } = await import("../src/modules/quoting");
const { prisma } = await import("../src/infra/db/prisma");
const { lastBusinessDayOfPreviousWeek } = await import(
  "../src/modules/quoting/infra/prisma-quoting-repositories"
);

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);

try {
  const activeSet = await parametersDeps.sets.active(new Date());
  if (!activeSet) throw new Error("No hay conjunto de parámetros activo.");
  console.log(`\nConjunto v${activeSet.version} (${activeSet.status})`);

  const today = new Date();
  console.log(
    `TRM fiscal = último día hábil de la semana anterior: ${lastBusinessDayOfPreviousWeek(today).toISOString().slice(0, 10)}`,
  );

  const vehicles = await quotingRepositories.vehicles.publishedForQuote(20);
  const ports = await quotingRepositories.ports.all();
  const buenaventura = ports.find((p) => p.unlocode === "COBUN");
  if (!buenaventura) throw new Error("Falta el puerto de Buenaventura.");

  console.log(`\nVehículos publicados: ${vehicles.length}\n`);

  // Un BEV chino y un combustión chino: las dos combinaciones cuyas tres líneas
  // de tributo están verificadas de punta a punta (SEED-DATA §10).
  const targets = vehicles.filter((v) => v.originCountry === "CN").slice(0, 3);

  for (const vehicle of targets) {
    for (const units of [1, 3]) {
      const { input, result } = await simulate(quotingRepositories, activeSet, {
        vehicleId: vehicle.id,
        destinationPortId: buenaventura.id,
        unitsInContainer: units,
        commercialMethod: "BY_CIF_VALUE",
        taxableBaseMethod: "BY_FOB_VALUE",
        addOnCodes: [],
        importerIsEndConsumer: true,
        hasOriginCertificate: false,
      });

      const tax = (code: string) =>
        result.lineItems.find((l) => l.code === code)?.amountCop.toNumber() ?? 0;

      console.log(
        `${vehicle.label} · ${vehicle.powertrain} · ${units} por contenedor`,
      );
      console.log(`  HS ${vehicle.hsCode} · origen ${vehicle.originCountry}`);
      console.log(`  FOB          US$ ${result.fobUsd.toNumber().toLocaleString("en-US")}`);
      console.log(`  CIF          US$ ${result.cifUsd.toNumber().toLocaleString("en-US")}`);
      console.log(`  Arancel      COP ${cop(tax("TAX.ARANCEL"))}`);
      console.log(`  IVA          COP ${cop(tax("TAX.IVA"))}`);
      console.log(`  Impoconsumo  COP ${cop(tax("TAX.IMPOCONSUMO"))}`);
      console.log(`  Landed cost  COP ${cop(result.landedCostCop.toNumber())}`);
      console.log(`  TOTAL        COP ${cop(result.totalCop.toNumber())}`);
      console.log(`  estado       ${result.status}`);
      if (result.warnings.length > 0) {
        for (const w of result.warnings) console.log(`    · [${w.level}] ${w.code}`);
      }
      console.log(
        `  TRM comercial ${input.fx.trmCommercial} · fiscal ${input.fx.trmFiscal}`,
      );
      console.log("");
    }
  }

  // Compartir contenedor tiene que abaratar la unidad.
  const solo = await simulate(quotingRepositories, activeSet, {
    vehicleId: targets[0]!.id,
    destinationPortId: buenaventura.id,
    unitsInContainer: 1,
    commercialMethod: "BY_CIF_VALUE",
    taxableBaseMethod: "BY_FOB_VALUE",
    addOnCodes: [],
    importerIsEndConsumer: true,
    hasOriginCertificate: false,
  });
  const shared = await simulate(quotingRepositories, activeSet, {
    vehicleId: targets[0]!.id,
    destinationPortId: buenaventura.id,
    unitsInContainer: 3,
    commercialMethod: "BY_CIF_VALUE",
    taxableBaseMethod: "BY_FOB_VALUE",
    addOnCodes: [],
    importerIsEndConsumer: true,
    hasOriginCertificate: false,
  });

  const saving = solo.result.totalCop.toNumber() - shared.result.totalCop.toNumber();
  console.log(`Ahorro al compartir contenedor entre 3: COP ${cop(saving)}`);
  console.log(saving > 0 ? "  ✓ compartir abarata" : "  ✗ compartir NO abarata");
  if (saving <= 0) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
