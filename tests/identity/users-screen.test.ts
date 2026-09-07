import { beforeEach, describe, expect, it } from "vitest";
import {
  changeUserRole,
  getUsersScreen,
  inviteUser,
  setUserStatus,
  UserOperationError,
  type Role,
  type UserRow,
  type UsersDeps,
  type UserStatus,
} from "@/modules/identity";

/**
 * Gestión de usuarios, probada sin base de datos.
 *
 * Las tres guardas de este módulo son lo que impide que un administrador se
 * deje —o deje a todos— fuera del back-office. Si fallan, la única recuperación
 * es acceso directo a Postgres, así que cada una tiene su prueba.
 */

const ME = "user-me";

function makeUser(over: Partial<UserRow> = {}): UserRow {
  return {
    id: "user-1",
    email: "uno@automocion.os",
    name: "Uno",
    role: "SALES",
    status: "ACTIVE",
    lastLoginAt: null,
    createdAt: new Date("2026-01-01"),
    ...over,
  };
}

function makeDeps(seed: UserRow[]) {
  const state = {
    users: [...seed],
    audit: [] as { action: string; entityId: string; before?: unknown; after?: unknown }[],
  };

  const matches = (u: UserRow, f: { role?: Role; status?: UserStatus; search?: string }) =>
    (f.role === undefined || u.role === f.role) &&
    (f.status === undefined || u.status === f.status) &&
    (f.search === undefined ||
      u.email.includes(f.search) ||
      (u.name ?? "").includes(f.search));

  const deps: UsersDeps = {
    users: {
      list: async (f, offset, limit) =>
        state.users.filter((u) => matches(u, f)).slice(offset, offset + limit),
      count: async (f) => state.users.filter((u) => matches(u, f)).length,
      byId: async (id) => state.users.find((u) => u.id === id) ?? null,
      byEmail: async (email) => state.users.find((u) => u.email === email) ?? null,
      invite: async (email, role) => {
        const created = makeUser({
          id: `user-${state.users.length + 1}`,
          email,
          role,
          status: "INVITED",
          name: null,
        });
        state.users.push(created);
        return created;
      },
      createCustomer: async (input) => {
        const created = makeUser({
          id: `user-${state.users.length + 1}`,
          email: input.email,
          name: input.name,
          role: "CUSTOMER",
          status: "ACTIVE",
        });
        state.users.push(created);
        return created;
      },
      changeRole: async (ids, role) => {
        let n = 0;
        for (const u of state.users) {
          if (ids.includes(u.id)) {
            u.role = role;
            n += 1;
          }
        }
        return n;
      },
      setStatus: async (ids, status) => {
        let n = 0;
        for (const u of state.users) {
          if (ids.includes(u.id)) {
            u.status = status;
            n += 1;
          }
        }
        return n;
      },
    },
    audit: {
      record: async (entry) => {
        state.audit.push({
          action: entry.action,
          entityId: entry.entityId,
          before: entry.before,
          after: entry.after,
        });
      },
    },
  };

  return { deps, state };
}

/** Dos administradores activos: el escenario sano. */
const TWO_ADMINS = [
  makeUser({ id: ME, email: "me@automocion.os", role: "ADMIN" }),
  makeUser({ id: "user-2", email: "otra@automocion.os", role: "ADMIN" }),
];

describe("listado", () => {
  it("pagina y cuenta con los filtros aplicados", async () => {
    const { deps } = makeDeps([
      ...TWO_ADMINS,
      makeUser({ id: "user-3", email: "cliente@x.com", role: "CUSTOMER" }),
    ]);

    const all = await getUsersScreen(deps, { filters: {}, page: 1, pageSize: 25 });
    expect(all.total).toBe(3);

    const admins = await getUsersScreen(deps, {
      filters: { role: "ADMIN" },
      page: 1,
      pageSize: 25,
    });
    expect(admins.total).toBe(2);
  });
});

describe("invitación", () => {
  let ctx: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    ctx = makeDeps(TWO_ADMINS.map((u) => ({ ...u })));
  });

  it("crea la cuenta en estado INVITED, sin contraseña", async () => {
    const created = await inviteUser(ctx.deps, {
      email: "nuevo@automocion.os",
      role: "SALES",
      actorId: ME,
    });
    expect(created.status).toBe("INVITED");
    expect(created.role).toBe("SALES");
  });

  it("rechaza un correo que ya existe", async () => {
    await expect(
      inviteUser(ctx.deps, { email: "otra@automocion.os", role: "SALES", actorId: ME }),
    ).rejects.toThrow(UserOperationError);
  });

  it("deja rastro de auditoría", async () => {
    await inviteUser(ctx.deps, { email: "n@automocion.os", role: "OPS", actorId: ME });
    expect(ctx.state.audit.some((a) => a.action === "INVITE")).toBe(true);
  });
});

describe("[GUARDA] no puedes cambiar tu propio rol", () => {
  it("rechaza incluirte a ti mismo en el cambio", async () => {
    const { deps } = makeDeps(TWO_ADMINS.map((u) => ({ ...u })));
    await expect(
      changeUserRole(deps, { ids: [ME], role: "CUSTOMER", actorId: ME }),
    ).rejects.toMatchObject({ code: "SELF_ROLE_CHANGE" });
  });

  it("permite cambiar el rol de otra persona", async () => {
    const { deps, state } = makeDeps(TWO_ADMINS.map((u) => ({ ...u })));
    await changeUserRole(deps, { ids: ["user-2"], role: "OPS", actorId: ME });
    expect(state.users.find((u) => u.id === "user-2")?.role).toBe("OPS");
  });
});

describe("[GUARDA] no puedes suspenderte a ti mismo", () => {
  it("rechaza suspender la propia cuenta", async () => {
    const { deps } = makeDeps(TWO_ADMINS.map((u) => ({ ...u })));
    await expect(
      setUserStatus(deps, { ids: [ME], status: "SUSPENDED", actorId: ME }),
    ).rejects.toMatchObject({ code: "SELF_SUSPEND" });
  });

  it("permite reactivarte a ti mismo", async () => {
    const { deps } = makeDeps(TWO_ADMINS.map((u) => ({ ...u })));
    await expect(
      setUserStatus(deps, { ids: [ME], status: "ACTIVE", actorId: ME }),
    ).resolves.toBe(1);
  });
});

describe("[GUARDA] nunca sin administrador activo", () => {
  it("rechaza degradar al último administrador", async () => {
    const { deps } = makeDeps([
      makeUser({ id: ME, email: "me@x.com", role: "ADMIN" }),
      makeUser({ id: "user-2", email: "solo@x.com", role: "ADMIN" }),
    ]);

    // Degradar al otro admin dejaría solo a ME... que sigue siendo admin: pasa.
    await expect(
      changeUserRole(deps, { ids: ["user-2"], role: "CUSTOMER", actorId: ME }),
    ).resolves.toBe(1);

    // Ahora ME es el único. Degradarlo lo bloquea la guarda de rol propio,
    // pero suspenderlo desde otra cuenta con permiso también debe bloquearse.
    const solo = makeDeps([makeUser({ id: "user-9", email: "u@x.com", role: "ADMIN" })]);
    await expect(
      setUserStatus(solo.deps, {
        ids: ["user-9"],
        status: "SUSPENDED",
        actorId: "otro",
      }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });

  it("permite suspender a un administrador si queda otro", async () => {
    const { deps } = makeDeps([
      ...TWO_ADMINS.map((u) => ({ ...u })),
      makeUser({ id: "user-3", email: "tres@x.com", role: "ADMIN" }),
    ]);
    await expect(
      setUserStatus(deps, { ids: ["user-3"], status: "SUSPENDED", actorId: ME }),
    ).resolves.toBe(1);
  });

  it("no cuenta a los suspendidos como administradores disponibles", async () => {
    const { deps } = makeDeps([
      makeUser({ id: "user-9", email: "a@x.com", role: "ADMIN" }),
      makeUser({ id: "user-8", email: "b@x.com", role: "ADMIN", status: "SUSPENDED" }),
    ]);
    await expect(
      setUserStatus(deps, { ids: ["user-9"], status: "SUSPENDED", actorId: "otro" }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });
});

describe("auditoría de cambios", () => {
  it("guarda el valor anterior y el nuevo", async () => {
    const { deps, state } = makeDeps(TWO_ADMINS.map((u) => ({ ...u })));
    await changeUserRole(deps, { ids: ["user-2"], role: "OPS", actorId: ME });

    const entry = state.audit.find((a) => a.action === "CHANGE_ROLE");
    expect(entry?.before).toMatchObject({ role: "ADMIN" });
    expect(entry?.after).toMatchObject({ role: "OPS" });
  });
});
