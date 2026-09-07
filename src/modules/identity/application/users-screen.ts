import { can, type Role } from "../domain/permissions";
import type {
  UserFilters,
  UserRepository,
  UserRow,
  UserStatus,
} from "../domain/user-ports";

/**
 * Casos de uso de /admin/usuarios.
 *
 * Aquí viven tres guardas que no son cosmética: sin ellas un administrador
 * puede dejarse a sí mismo —o a toda la organización— fuera del back-office, y
 * la única forma de recuperarlo sería un acceso directo a la base de datos.
 */

export interface UsersDeps {
  users: UserRepository;
  audit: {
    record(entry: {
      actorId: string | null;
      entity: string;
      entityId: string;
      action: string;
      before?: unknown;
      after?: unknown;
      reason?: string;
    }): Promise<void>;
  };
}

export class UserOperationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "UserOperationError";
  }
}

export interface UsersScreenData {
  rows: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: UserFilters;
}

export async function getUsersScreen(
  deps: UsersDeps,
  options: { filters: UserFilters; page: number; pageSize: number },
): Promise<UsersScreenData> {
  const offset = (options.page - 1) * options.pageSize;
  const [rows, total] = await Promise.all([
    deps.users.list(options.filters, offset, options.pageSize),
    deps.users.count(options.filters),
  ]);
  return { rows, total, page: options.page, pageSize: options.pageSize, filters: options.filters };
}

/**
 * ¿Quedaría alguien capaz de administrar el sistema después de este cambio?
 *
 * Se cuenta sobre los usuarios ACTIVOS con permiso `users.write`. Si el cambio
 * los dejaría en cero, se rechaza: el back-office quedaría sin nadie que pueda
 * volver a repartir permisos.
 */
async function assertAdministrableAfter(
  deps: UsersDeps,
  changing: readonly string[],
  stillAdmin: (row: UserRow) => boolean,
): Promise<void> {
  const active = await deps.users.list({ status: "ACTIVE" }, 0, 1000);
  const remaining = active.filter((row) =>
    changing.includes(row.id) ? stillAdmin(row) : can(row.role, "users.write"),
  );
  if (remaining.length === 0) {
    throw new UserOperationError(
      "LAST_ADMIN",
      "El cambio dejaría el sistema sin ningún administrador activo.",
    );
  }
}

export async function inviteUser(
  deps: UsersDeps,
  options: { email: string; role: Role; actorId: string },
): Promise<UserRow> {
  const existing = await deps.users.byEmail(options.email);
  if (existing) {
    throw new UserOperationError("ALREADY_EXISTS", "Ya existe una cuenta con ese correo.");
  }

  const created = await deps.users.invite(options.email, options.role);
  await deps.audit.record({
    actorId: options.actorId,
    entity: "User",
    entityId: created.id,
    action: "INVITE",
    after: { email: created.email, role: created.role },
  });
  return created;
}

export async function changeUserRole(
  deps: UsersDeps,
  options: { ids: readonly string[]; role: Role; actorId: string },
): Promise<number> {
  // Nadie cambia su propio rol: es el camino más corto a perder el acceso sin
  // que nadie más pueda devolvértelo.
  if (options.ids.includes(options.actorId)) {
    throw new UserOperationError(
      "SELF_ROLE_CHANGE",
      "No puedes cambiar tu propio rol. Pídeselo a otro administrador.",
    );
  }

  await assertAdministrableAfter(deps, options.ids, () => can(options.role, "users.write"));

  // Se COPIAN los valores antes de mutar. Guardar la fila y leerla después
  // deja el registro a merced de si el repositorio devolvió una instantánea o
  // una referencia viva — y con una referencia viva la auditoría acaba
  // guardando el valor nuevo como si fuera el anterior.
  const before = (await Promise.all(options.ids.map((id) => deps.users.byId(id))))
    .filter((row): row is UserRow => row !== null)
    .map((row) => ({ id: row.id, role: row.role }));

  const changed = await deps.users.changeRole(options.ids, options.role);

  for (const snapshot of before) {
    await deps.audit.record({
      actorId: options.actorId,
      entity: "User",
      entityId: snapshot.id,
      action: "CHANGE_ROLE",
      before: { role: snapshot.role },
      after: { role: options.role },
    });
  }
  return changed;
}

export async function setUserStatus(
  deps: UsersDeps,
  options: { ids: readonly string[]; status: UserStatus; actorId: string },
): Promise<number> {
  if (options.ids.includes(options.actorId) && options.status !== "ACTIVE") {
    throw new UserOperationError(
      "SELF_SUSPEND",
      "No puedes suspender tu propia cuenta.",
    );
  }

  if (options.status !== "ACTIVE") {
    await assertAdministrableAfter(deps, options.ids, () => false);
  }

  // Igual que arriba: copiar antes de mutar, no guardar la referencia.
  const before = (await Promise.all(options.ids.map((id) => deps.users.byId(id))))
    .filter((row): row is UserRow => row !== null)
    .map((row) => ({ id: row.id, status: row.status }));

  const changed = await deps.users.setStatus(options.ids, options.status);

  for (const snapshot of before) {
    await deps.audit.record({
      actorId: options.actorId,
      entity: "User",
      entityId: snapshot.id,
      action: "SET_STATUS",
      before: { status: snapshot.status },
      after: { status: options.status },
    });
  }
  return changed;
}
