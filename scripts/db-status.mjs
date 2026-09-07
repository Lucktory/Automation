import { readFileSync } from "node:fs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

/**
 * Estado de la base de datos.
 *
 * Usa el mismo adaptador que la aplicación —el driver serverless de Neon— para
 * que lo que aquí funcione sea exactamente lo que funciona en la app.
 */

neonConfig.webSocketConstructor = ws;

const match = readFileSync(".env.local", "utf8").match(/^DATABASE_URL="(.+)"\s*$/m);
if (!match) throw new Error("No se encontró DATABASE_URL en .env.local");

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: match[1] }),
});

const [tables] = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'
`;
const [enums] = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS n FROM pg_type t
  JOIN pg_namespace ns ON ns.oid = t.typnamespace
  WHERE ns.nspname = 'public' AND t.typtype = 'e'
`;
const [indexes] = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS n FROM pg_indexes WHERE schemaname = 'public'
`;

console.log(`tablas:   ${tables.n}`);
console.log(`enums:    ${enums.n}`);
console.log(`índices:  ${indexes.n}`);

console.log("\nfilas:");
const counts = {
  "reglas arancelarias": await prisma.tariffRule.count(),
  "tarifas de flete": await prisma.freightRate.count(),
  "costos de destino": await prisma.destinationCostRule.count(),
  vehículos: await prisma.vehicle.count(),
  "conjuntos de parámetros": await prisma.pricingParameterSet.count(),
  "tasas de cambio": await prisma.fxRate.count(),
  usuarios: await prisma.user.count(),
};
for (const [name, n] of Object.entries(counts)) {
  console.log(`  ${name.padEnd(26)} ${n}`);
}

await prisma.$disconnect();
