import type { Role } from "./permissions";

/**
 * Puertos de gestión de usuarios.
 *
 * Los define el dominio y los implementa `infra/`. La aplicación depende de
 * estas interfaces, así que los casos de uso se prueban con dobles en memoria.
 */

export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "DELETED";

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface UserFilters {
  /** Busca en nombre y correo. */
  search?: string;
  role?: Role;
  status?: UserStatus;
}

export interface UserRepository {
  list(filters: UserFilters, offset: number, limit: number): Promise<UserRow[]>;
  count(filters: UserFilters): Promise<number>;
  byId(id: string): Promise<UserRow | null>;
  byEmail(email: string): Promise<UserRow | null>;
  invite(email: string, role: Role): Promise<UserRow>;
  /**
   * Alta pública. Siempre CLIENTE y siempre ACTIVA — la persona acaba de fijar
   * su propia contraseña. Los roles del back-office solo llegan por invitación.
   *
   * Registra el consentimiento de habeas data en el mismo escrito que la
   * cuenta: guardarlo aparte permitiría que existiera una cuenta sin él, que es
   * exactamente lo que la Ley 1581 de 2012 no admite.
   */
  createCustomer(input: {
    email: string;
    name: string;
    phone: string;
    passwordHash: string;
    locale: string;
    consentVersion: string;
    consentAt: Date;
  }): Promise<UserRow>;
  changeRole(ids: readonly string[], role: Role): Promise<number>;
  setStatus(ids: readonly string[], status: UserStatus): Promise<number>;
}
