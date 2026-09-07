import { getTranslations, setRequestLocale } from "next-intl/server";
import { usersDeps } from "@/composition/container";
import { ROLE_DISPLAY, ROLES_BY_PRIVILEGE, STATUS_TONE } from "@/config/role-display";
import { formatDate } from "@/core/format";
import type { Locale } from "@/i18n/routing";
import { can, getUsersScreen, type Role, type UserStatus } from "@/modules/identity";
import { currentUser } from "@/modules/identity/server";
import { InvitePanel } from "./InvitePanel";
import { UsersToolbar } from "./UsersToolbar";
import { UsersTable, type UserRowView } from "./UsersTable";

const PAGE_SIZE = 25;
const MS_PER_DAY = 86_400_000;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;

/** Tiempo relativo con `Intl`, nunca a mano. */
function relative(date: Date | null, locale: Locale, never: string): string {
  if (date === null) return never;

  const rtf = new Intl.RelativeTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    numeric: "auto",
  });
  const elapsedDays = (date.getTime() - Date.now()) / MS_PER_DAY;

  if (Math.abs(elapsedDays) >= 1) return rtf.format(Math.round(elapsedDays), "day");
  const hours = elapsedDays * HOURS_PER_DAY;
  if (Math.abs(hours) >= 1) return rtf.format(Math.round(hours), "hour");
  return rtf.format(Math.round(hours * MINUTES_PER_HOUR), "minute");
}

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; rol?: string; estado?: string; page?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const t = await getTranslations("admin.users");
  const viewer = await currentUser();
  const canWrite = viewer !== null && can(viewer.role, "users.write");

  const validRole = ROLES_BY_PRIVILEGE.includes(sp.rol as Role) ? (sp.rol as Role) : undefined;
  const validStatus = (["ACTIVE", "INVITED", "SUSPENDED"] as const).includes(
    sp.estado as never,
  )
    ? (sp.estado as UserStatus)
    : undefined;

  const screen = await getUsersScreen(usersDeps, {
    filters: {
      ...(sp.q ? { search: sp.q } : {}),
      ...(validRole ? { role: validRole } : {}),
      ...(validStatus ? { status: validStatus } : {}),
    },
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: UserRowView[] = screen.rows.map((row) => {
    const display = row.name ?? row.email;
    return {
      id: row.id,
      name: display,
      email: row.email,
      initials: display.slice(0, 2).toUpperCase(),
      roleLabel: t(`roles.${row.role}`),
      roleTone: ROLE_DISPLAY[row.role].tone,
      statusLabel: t(`statuses.${row.status}`),
      statusTone: STATUS_TONE[row.status],
      lastAccessLabel: relative(row.lastLoginAt, locale, t("never")),
      createdLabel: formatDate(row.createdAt, locale, "short"),
      isSelf: row.id === viewer?.id,
      isSuspended: row.status === "SUSPENDED",
    };
  });

  // SUPERADMIN no se asigna desde la interfaz: se siembra.
  const assignableRoles = ROLES_BY_PRIVILEGE.filter((r) => r !== "SUPERADMIN");

  const totalPages = Math.max(1, Math.ceil(screen.total / PAGE_SIZE));
  const errors = Object.fromEntries(
    ["ALREADY_EXISTS", "SELF_ROLE_CHANGE", "SELF_SUSPEND", "LAST_ADMIN", "INVALID"].map(
      (code) => [code, t(`errors.${code}`)],
    ),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-xl font-semibold text-text-primary">
            {t("title")}
          </h1>
          <span className="text-sm text-text-secondary">
            {t("count", { count: screen.total })}
          </span>
        </div>

        {canWrite && (
          <div className="shrink-0">
            <InvitePanel
              roles={assignableRoles.map((role) => ({
                value: role,
                label: t(`roles.${role}`),
                hint: t(`roleHints.${role}`),
                tone: ROLE_DISPLAY[role].tone,
              }))}
              labels={{
                trigger: t("invite"),
                title: t("invitePanel.title"),
                subtitle: t("invitePanel.subtitle"),
                email: t("invitePanel.email"),
                emailPlaceholder: t("invitePanel.emailPlaceholder"),
                role: t("invitePanel.role"),
                cancel: t("invitePanel.cancel"),
                send: t("invitePanel.send"),
                sent: t.raw("invitePanel.sent") as string,
                close: t("bulk.clear"),
                errors,
              }}
            />
          </div>
        )}
      </div>

      <UsersToolbar
        roles={assignableRoles.map((role) => ({
          value: role,
          label: t(`roles.${role}`),
        }))}
        statuses={(["ACTIVE", "INVITED", "SUSPENDED"] as const).map((status) => ({
          value: status,
          label: t(`statuses.${status}`),
        }))}
        labels={{
          searchPlaceholder: t("searchPlaceholder"),
          allRoles: t("filterRole", { value: t("all") }),
          allStatuses: t("filterStatus", { value: t("all") }),
          export: t("export"),
          exporting: t("exporting"),
        }}
      />

      <section className="rounded-card border border-border bg-surface">
        <UsersTable
          rows={rows}
          canWrite={canWrite}
          roles={assignableRoles.map((role) => ({ value: role, label: t(`roles.${role}`) }))}
          columns={{
            user: t("columns.user"),
            role: t("columns.role"),
            status: t("columns.status"),
            lastAccess: t("columns.lastAccess"),
            created: t("columns.created"),
            actions: t("columns.actions"),
          }}
          labels={{
            empty: t("empty"),
            selectedOne: t("bulk.selectedOne"),
            selectedMany: t.raw("bulk.selectedMany") as string,
            reactivate: t("bulk.reactivate"),
            rowActions: t("bulk.rowActions"),
            changeRole: t("bulk.changeRole"),
            suspend: t("bulk.suspend"),
            clear: t("bulk.clear"),
            errors,
          }}
        />

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-text-muted sm:px-5">
          <span>{t("showing", { count: rows.length, total: screen.total })}</span>
          <span>{t("pageOf", { page, total: totalPages })}</span>
        </footer>
      </section>
    </div>
  );
}
