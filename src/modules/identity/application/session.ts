import { can, type Permission, type Role } from "../domain/permissions";
import { auth } from "../infra/auth";

/**
 * Puerta de entrada a la sesión para el resto de la aplicación.
 *
 * `requirePermission` es la única forma correcta de proteger una acción de
 * servidor o una página del back-office. El middleware protege las RUTAS, pero
 * una acción de servidor se puede invocar directamente: la autorización tiene
 * que comprobarse también donde se ejecuta el efecto.
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  locale: string;
}

export class UnauthorizedError extends Error {
  constructor(readonly permission: Permission) {
    super(`Falta el permiso "${permission}".`);
    this.name = "UnauthorizedError";
  }
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email || !user.role) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    locale: user.locale ?? "es",
  };
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await currentUser();
  if (!user || !can(user.role, permission)) {
    throw new UnauthorizedError(permission);
  }
  return user;
}
