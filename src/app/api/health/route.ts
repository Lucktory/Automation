import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { prisma } from "@/infra/db/prisma";

/**
 * Diagnóstico de despliegue.
 *
 * Existe porque un fallo en producción llega como «Application error: a
 * server-side exception has occurred» y un dígito de dieciséis cifras. Ese
 * mensaje no distingue entre una variable sin definir, una base de datos
 * inalcanzable y unas tablas que nunca se migraron —tres causas con tres
 * arreglos distintos—, y averiguarlo obliga a rebuscar en los registros del
 * proveedor. Esta ruta responde las tres preguntas de una vez.
 *
 * NUNCA DEVUELVE UN VALOR, sólo si está puesto o no. Un diagnóstico que filtra
 * la cadena de conexión al primero que la pida es peor que el problema que
 * resuelve.
 *
 * Es una herramienta de despliegue, no parte del producto: cuando esto deje de
 * ser una demostración, bórrala o ponla detrás de `CRON_SECRET`.
 */

export const dynamic = "force-dynamic";

/** Presencia, nunca contenido. */
const isSet = (value: string | undefined) => value !== undefined && value.length > 0;

export async function GET() {
  const config = {
    DATABASE_URL: isSet(env.DATABASE_URL),
    AUTH_SECRET: isSet(env.AUTH_SECRET),
    AUTH_URL: isSet(env.AUTH_URL),
    SEED_ADMIN_PASSWORD: isSet(env.SEED_ADMIN_PASSWORD),
    NODE_ENV: env.NODE_ENV,
  };

  // Sin las tres obligatorias no tiene sentido intentar la consulta: el error
  // que saldría hablaría de la base cuando el problema es la configuración.
  const missing = (["DATABASE_URL", "AUTH_SECRET", "AUTH_URL"] as const).filter(
    (key) => config[key] === false,
  );

  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        problem: "MISSING_ENV",
        missing,
        hint: "Añádelas en las variables de entorno del proyecto y vuelve a desplegar. Pega los valores SIN comillas. Ver docs/DEPLOY.md §2.",
        config,
      },
      { status: 503 },
    );
  }

  try {
    // Cuenta lo que el sitio necesita para no verse vacío. Un cero aquí explica
    // una pantalla en blanco mucho mejor que cualquier registro.
    const [vehicles, parameterSets, freightRates, users, quotes] = await Promise.all([
      prisma.vehicle.count({ where: { isPublished: true } }),
      prisma.pricingParameterSet.count({ where: { status: "ACTIVE" } }),
      prisma.freightRate.count(),
      prisma.user.count(),
      prisma.quote.count(),
    ]);

    const seeded = vehicles > 0 && parameterSets > 0;

    return NextResponse.json({
      ok: seeded,
      ...(seeded ? {} : { problem: "NOT_SEEDED" }),
      ...(seeded
        ? {}
        : {
            hint: "Las tablas existen pero están vacías. Ejecuta `npx prisma migrate deploy` y luego `npm run seed:demo` apuntando a esta misma base.",
          }),
      database: "reachable",
      counts: { vehicles, parameterSets, freightRates, users, quotes },
      config,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Una tabla que no existe es una migración que no se corrió, no una base
    // caída. Son arreglos distintos y conviene no confundirlos.
    const notMigrated = /does not exist|relation .* does not exist|P2021|P2022/i.test(message);

    return NextResponse.json(
      {
        ok: false,
        problem: notMigrated ? "NOT_MIGRATED" : "DATABASE_UNREACHABLE",
        hint: notMigrated
          ? "La base responde pero le faltan tablas. Ejecuta `npx prisma migrate deploy` contra esta base."
          : "No se pudo consultar la base. Revisa que DATABASE_URL apunte al endpoint agrupado (-pooler) y que lleve ?sslmode=require.",
        database: message,
        config,
      },
      { status: 503 },
    );
  }
}
