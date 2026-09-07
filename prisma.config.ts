import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Configuración de la CLI de Prisma.
 *
 * Existe por dos razones concretas:
 *
 * 1. La CLI de Prisma carga `.env`, pero Next.js carga `.env.local`. Sin esto,
 *    `npm run db:migrate` no encuentra `DATABASE_URL` aunque la aplicación sí,
 *    y el error resultante ("Environment variable not found") apunta al sitio
 *    equivocado. Aquí se cargan los dos, con `.env.local` teniendo prioridad
 *    por ser el primero: dotenv no sobrescribe lo ya definido.
 *
 * 2. `package.json#prisma` está deprecado y desaparece en Prisma 7.
 */

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
