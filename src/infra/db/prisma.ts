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
 *
 * EL CLIENTE SE CREA PEREZOSAMENTE, y eso no es una optimización.
 * `next build` importa cada módulo de ruta para recoger sus datos de página, así
 * que construir el cliente al importar hacía que un despliegue sin
 * `DATABASE_URL` muriera durante el build, dentro de un rastro de pila de
 * webpack que no menciona la variable por ningún lado. Difiriéndolo, el build
 * termina y la falta de configuración aparece en la primera consulta, con un
 * mensaje que dice exactamente qué falta.
 */

// El driver de Neon habla WebSocket; en Node hay que darle una implementación.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  if (env.DATABASE_URL === undefined) {
    throw new Error(
      "DATABASE_URL no está definida. En local, cópiala en .env.local; " +
        "en un despliegue, añádela a las variables de entorno del proyecto. " +
        "Ver docs/DEPLOY.md §2.",
    );
  }

  const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function client(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const created = createClient();
  if (env.NODE_ENV !== "production") globalForPrisma.prisma = created;
  return created;
}

/**
 * Se comporta como un `PrismaClient` normal —`prisma.quote.findMany(...)`—
 * pero no toca la base ni lee la configuración hasta que alguien accede a una
 * propiedad de verdad.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const value = Reflect.get(client(), property, receiver);
    // Los métodos de Prisma pierden su `this` al extraerlos del proxy.
    return typeof value === "function" ? value.bind(client()) : value;
  },
  has: (_target, property) => property in client(),
  ownKeys: () => Reflect.ownKeys(client()),
  getOwnPropertyDescriptor: (_target, property) =>
    Reflect.getOwnPropertyDescriptor(client(), property),
});
