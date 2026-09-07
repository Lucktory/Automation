/**
 * Permisos como DATOS, no como ramas.
 *
 * La respuesta de alta calidad a "añadir un permiso" es una entrada más en esta
 * matriz, nunca un `if (role === "ADMIN" || role === "OPS")` esparcido por la
 * aplicación. Un permiso que no está aquí no existe.
 */

export const ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "OPS",
  "SALES",
  "CONTENT_EDITOR",
  "CUSTOMER",
  "PARTNER",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "admin.access",
  "parameters.read",
  "parameters.write",
  "parameters.publish",
  "inventory.read",
  "inventory.write",
  "quotes.read",
  "quotes.write",
  "quotes.send",
  "orders.read",
  "orders.write",
  "content.write",
  "users.read",
  "users.write",
  "settings.write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * La matriz. Leerla de arriba abajo dice exactamente quién puede qué.
 *
 * Nótese que `parameters.publish` está deliberadamente más restringido que
 * `parameters.write`: cambiar una tarifa en un borrador es trabajo diario;
 * activarla mueve el precio de todas las cotizaciones nuevas.
 */
const MATRIX: Record<Role, readonly Permission[]> = {
  SUPERADMIN: [...PERMISSIONS],

  ADMIN: [
    "admin.access",
    "parameters.read",
    "parameters.write",
    "parameters.publish",
    "inventory.read",
    "inventory.write",
    "quotes.read",
    "quotes.write",
    "quotes.send",
    "orders.read",
    "orders.write",
    "content.write",
    "users.read",
    "users.write",
    "settings.write",
  ],

  // Operaciones edita parámetros y pedidos, pero NO publica un conjunto.
  OPS: [
    "admin.access",
    "parameters.read",
    "parameters.write",
    "inventory.read",
    "inventory.write",
    "quotes.read",
    "orders.read",
    "orders.write",
  ],

  SALES: [
    "admin.access",
    "parameters.read",
    "inventory.read",
    "quotes.read",
    "quotes.write",
    "quotes.send",
    "orders.read",
  ],

  CONTENT_EDITOR: ["admin.access", "inventory.read", "content.write"],

  CUSTOMER: [],

  PARTNER: ["orders.read"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return MATRIX[role];
}

/** Los roles que pueden entrar al back-office. Deriva de la matriz, no se repite. */
export function isBackOfficeRole(role: Role): boolean {
  return can(role, "admin.access");
}
