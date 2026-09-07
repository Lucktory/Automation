import { NextResponse, type NextRequest } from "next/server";
import { usersDeps } from "@/composition/container";
import { ROLES, getUsersScreen, type Role, type UserStatus } from "@/modules/identity";
import { requirePermission } from "@/modules/identity/server";

/**
 * Exportación de usuarios a CSV.
 *
 * Respeta los filtros de la pantalla: se exporta lo que se está viendo, no
 * toda la tabla. Exportar algo distinto de lo que muestra el filtro es una
 * sorpresa desagradable cuando el archivo llega a un tercero.
 */

const MAX_ROWS = 5000;
const STATUSES: readonly UserStatus[] = ["ACTIVE", "INVITED", "SUSPENDED", "DELETED"];

/** Escapa un campo CSV según RFC 4180. */
function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(request: NextRequest) {
  await requirePermission("users.read");

  const params = request.nextUrl.searchParams;
  const rol = params.get("rol");
  const estado = params.get("estado");
  const q = params.get("q");

  const screen = await getUsersScreen(usersDeps, {
    filters: {
      ...(q ? { search: q } : {}),
      ...(ROLES.includes(rol as Role) ? { role: rol as Role } : {}),
      ...(STATUSES.includes(estado as UserStatus) ? { status: estado as UserStatus } : {}),
    },
    page: 1,
    pageSize: MAX_ROWS,
  });

  const header = ["nombre", "correo", "rol", "estado", "ultimo_acceso", "creado"];
  const lines = [
    header.join(","),
    ...screen.rows.map((row) =>
      [
        row.name ?? "",
        row.email,
        row.role,
        row.status,
        row.lastLoginAt?.toISOString() ?? "",
        row.createdAt.toISOString(),
      ]
        .map(csvField)
        .join(","),
    ),
  ];

  // BOM para que Excel en Windows abra los acentos correctamente. Sin él,
  // "Sofía Pardo" llega como "SofÃ­a Pardo".
  const csv = `﻿${lines.join("\r\n")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="usuarios.csv"',
      "Cache-Control": "no-store",
    },
  });
}
