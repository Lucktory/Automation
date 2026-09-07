import { can } from "@/modules/identity";
import { currentUser } from "@/modules/identity/server";
import { prisma } from "@/infra/db/prisma";

/**
 * Exporta el inventario a CSV.
 *
 * Sirve un archivo de verdad, no una descarga simulada: es la diferencia entre
 * un botón que responde y uno decorativo.
 *
 * Lleva BOM UTF-8 al principio porque Excel en Windows —que es donde se abre
 * este archivo— interpreta un CSV sin BOM como Latin-1 y convierte "Bogotá" en
 * "BogotÃ¡". El BOM es feo y es lo que hace que el archivo se lea bien.
 */

const BOM = "﻿";

/** Escapa un campo según RFC 4180: comillas dobladas y entrecomillado. */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET() {
  const user = await currentUser();
  if (!user || !can(user.role, "inventory.read")) {
    return new Response("No autorizado.", { status: 403 });
  }

  const rows = await prisma.vehicle
    .findMany({
      orderBy: [{ isPublished: "desc" }, { estLandedCop: "asc" }],
      select: {
        slug: true,
        modelYear: true,
        powertrain: true,
        bodyType: true,
        originCountryCode: true,
        fobUsd: true,
        estLandedCop: true,
        eligibilityStatus: true,
        status: true,
        isPublished: true,
        trim: {
          select: {
            name: true,
            model: { select: { name: true, brand: { select: { name: true } } } },
          },
        },
      },
    })
    .catch(() => []);

  const header = [
    "slug",
    "marca",
    "modelo",
    "version",
    "anio",
    "motorizacion",
    "carroceria",
    "origen",
    "fob_usd",
    "puesto_en_colombia_cop",
    "elegibilidad",
    "estado",
    "publicado",
  ];

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.slug,
        row.trim.model.brand.name,
        row.trim.model.name,
        row.trim.name,
        row.modelYear,
        row.powertrain,
        row.bodyType,
        row.originCountryCode,
        row.fobUsd === null ? "" : Number(row.fobUsd),
        row.estLandedCop === null ? "" : Number(row.estLandedCop),
        row.eligibilityStatus,
        row.status,
        row.isPublished ? "si" : "no",
      ]
        .map(cell)
        .join(","),
    ),
  ];

  const today = new Date().toISOString().slice(0, 10);

  return new Response(BOM + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="inventario-${today}.csv"`,
    },
  });
}
