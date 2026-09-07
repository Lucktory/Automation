import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_NAV } from "@/config/navigation";
import { can } from "@/modules/identity";
import { currentUser } from "@/modules/identity/server";
import type { Locale } from "@/i18n/routing";

/**
 * Shell del back-office.
 *
 * El middleware ya bloquea la ruta, pero la comprobación se repite aquí: una
 * defensa de ruta y otra en el punto donde se leen los datos no son redundantes,
 * son capas distintas. La navegación se filtra por permiso, así que la barra
 * lateral nunca muestra una sección que el usuario no puede abrir.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const user = await currentUser();
  if (!user || !can(user.role, "admin.access")) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("admin");
  const items = ADMIN_NAV.filter((item) => can(user.role, item.permission));
  const label = user.name ?? user.email;

  return (
    <AdminShell
      items={items}
      breadcrumb={t("breadcrumb.root")}
      userLabel={label}
      userInitials={label.slice(0, 2).toUpperCase()}
      labels={{ openMenu: t("shell.openMenu"), closeMenu: t("shell.closeMenu") }}
    >
      {children}
    </AdminShell>
  );
}
