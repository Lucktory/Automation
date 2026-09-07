import type { Prisma, PrismaClient } from "@prisma/client";
import type { Role } from "../domain/permissions";
import type {
  UserFilters,
  UserRepository,
  UserRow,
  UserStatus,
} from "../domain/user-ports";

/**
 * Adaptador Prisma del repositorio de usuarios.
 * Único sitio donde se traduce entre el esquema y el dominio.
 */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  private static toRow(row: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    status: string;
    lastLoginAt: Date | null;
    createdAt: Date;
  }): UserRow {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as Role,
      status: row.status as UserStatus,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
    };
  }

  /**
   * Los usuarios borrados no se listan nunca: `deletedAt` es un borrado suave y
   * mostrarlos sería filtrar cuentas que el operador cree eliminadas.
   */
  private static where(filters: UserFilters): Prisma.UserWhereInput {
    const search = filters.search?.trim();
    return {
      deletedAt: null,
      ...(filters.role !== undefined ? { role: filters.role as never } : {}),
      ...(filters.status !== undefined ? { status: filters.status as never } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
  }

  async list(filters: UserFilters, offset: number, limit: number): Promise<UserRow[]> {
    const rows = await this.db.user.findMany({
      where: PrismaUserRepository.where(filters),
      orderBy: [{ createdAt: "desc" }],
      skip: offset,
      take: limit,
    });
    return rows.map(PrismaUserRepository.toRow);
  }

  count(filters: UserFilters): Promise<number> {
    return this.db.user.count({ where: PrismaUserRepository.where(filters) });
  }

  async byId(id: string): Promise<UserRow | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? PrismaUserRepository.toRow(row) : null;
  }

  async byEmail(email: string): Promise<UserRow | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    return row ? PrismaUserRepository.toRow(row) : null;
  }

  /** Invita: crea la cuenta SIN contraseña y en estado INVITED. */
  async invite(email: string, role: Role): Promise<UserRow> {
    const row = await this.db.user.create({
      data: { email, role: role as never, status: "INVITED" },
    });
    return PrismaUserRepository.toRow(row);
  }

  async createCustomer(input: {
    email: string;
    name: string;
    phone: string;
    passwordHash: string;
    locale: string;
    consentVersion: string;
    consentAt: Date;
  }): Promise<UserRow> {
    const row = await this.db.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash: input.passwordHash,
        locale: input.locale,
        role: "CUSTOMER",
        status: "ACTIVE",
        // El consentimiento se escribe con la cuenta, no después.
        dataConsentAt: input.consentAt,
        dataConsentVersion: input.consentVersion,
      },
    });
    return PrismaUserRepository.toRow(row);
  }

  async changeRole(ids: readonly string[], role: Role): Promise<number> {
    const result = await this.db.user.updateMany({
      where: { id: { in: [...ids] } },
      data: { role: role as never },
    });
    return result.count;
  }

  async setStatus(ids: readonly string[], status: UserStatus): Promise<number> {
    const result = await this.db.user.updateMany({
      where: { id: { in: [...ids] } },
      data: { status: status as never },
    });
    return result.count;
  }
}
