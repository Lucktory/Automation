"use client";

import * as Icons from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { activeAdminItem, type AdminNavItem } from "@/config/navigation";
import { Logo } from "@/components/ui/Logo";

/**
 * Barra lateral del back-office.
 *
 * No nombra ninguna página: recibe el árbol ya filtrado por permisos. El ítem
 * activo lleva superficie elevada y una barra azul de 3px a la izquierda, como
 * en el diseño aprobado.
 *
 * `inDrawer` la usa el shell móvil: misma barra, con sombra propia porque ahí
 * flota sobre el contenido en vez de estar encajada en el layout.
 */
export function AdminSidebar({
  items,
  inDrawer = false,
}: {
  items: readonly AdminNavItem[];
  inDrawer?: boolean;
}) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  const current = activeAdminItem(items, pathname);

  return (
    <nav
      aria-label="Back office"
      className={clsx(
        "flex w-60 shrink-0 flex-col border-r border-border bg-surface",
        inDrawer && "h-full shadow-2xl",
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Logo variant="full" height={22} />
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon =
            (Icons[item.icon as keyof typeof Icons] as Icons.LucideIcon | undefined) ??
            Icons.Circle;
          const active = current?.key === item.key;

          return (
            <li key={item.key} className="relative">
              {active && (
                <span
                  aria-hidden
                  className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r bg-primary"
                />
              )}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-surface-elevated font-medium text-text-primary"
                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
                )}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden />
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
