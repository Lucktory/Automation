import type { Role } from "@/modules/identity";

/**
 * Presentación de los roles: color y orden, como datos.
 *
 * DESVIACIÓN DELIBERADA DEL DISEÑO GENERADO. El mockup pintaba "Operaciones"
 * con el acento teal (#00D0C0), pero la regla 3 del sistema reserva ese color
 * para DATOS —la cifra del landed cost, la barra del total—. Gastarlo en una
 * píldora de rol lo devalúa justo donde más importa que signifique algo.
 *
 * "Cliente" baja a gris a propósito: es el rol menos privilegiado y el más
 * numeroso, así que apagarlo hace que los privilegiados salten a la vista. El
 * ámbar de "Administrador" sí se conserva del diseño — un privilegio elevado
 * tiene que verse de un vistazo.
 */

export type PillTone = "success" | "warning" | "danger" | "info" | "primary" | "muted";

export interface RoleDisplay {
  tone: PillTone;
  /** Orden en filtros y listas: de más privilegio a menos. */
  order: number;
}

export const ROLE_DISPLAY: Record<Role, RoleDisplay> = {
  SUPERADMIN: { tone: "danger", order: 10 },
  ADMIN: { tone: "warning", order: 20 },
  OPS: { tone: "info", order: 30 },
  SALES: { tone: "primary", order: 40 },
  CONTENT_EDITOR: { tone: "muted", order: 50 },
  PARTNER: { tone: "muted", order: 60 },
  CUSTOMER: { tone: "muted", order: 70 },
};

export type UserStatusValue = "ACTIVE" | "INVITED" | "SUSPENDED" | "DELETED";

/** El punto de estado: verde activo, ámbar invitado, gris suspendido. */
export const STATUS_TONE: Record<UserStatusValue, PillTone> = {
  ACTIVE: "success",
  INVITED: "warning",
  SUSPENDED: "muted",
  DELETED: "danger",
};

export const ROLES_BY_PRIVILEGE = (Object.keys(ROLE_DISPLAY) as Role[]).sort(
  (a, b) => ROLE_DISPLAY[a].order - ROLE_DISPLAY[b].order,
);
