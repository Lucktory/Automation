import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import ws from "ws";
import { env } from "@/config/env";

/**
 * Cliente Prisma único, sobre el driver serverless de Neon.
 *
 * Se usa un ADAPTADOR DE DRIVER en vez del motor nativo de Prisma por dos
 * razones: el binario nativo aborta con STATUS_ILLEGAL_INSTRUCTION en la
 * máquina de desarrollo, y en producción serverless el driver de Neon es la
 * opción recomendada de todos modos — es JavaScript puro, pesa menos y no
 * arrastra un binario por plataforma.
 *
 * En desarrollo Next recarga los módulos en cada cambio, y cada recarga crearía
 * un cliente nuevo hasta agotar el pool. Se guarda en el objeto global para
 * sobrevivir al hot reload.
 *
 * Este es el ÚNICO archivo que instancia Prisma. Los repositorios lo reciben
 * por inyección desde el composition root; el dominio no sabe que existe.
 */

// El driver de Neon habla WebSocket; en Node hay que darle una implementación.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  if (env.DATABASE_URL === undefined) {
    throw new Error(
      "DATABASE_URL no está definida. Cópiala en .env.local antes de arrancar.",
    );
  }

  const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
