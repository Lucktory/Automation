"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { activeAdminItem, type AdminNavItem } from "@/config/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";

/**
 * Shell del back-office, responsive.
 *
 * A partir de `lg` la barra lateral es fija, como en el diseño aprobado. Por
 * debajo se convierte en un cajón que se desliza sobre el contenido: una barra
 * de 240px fijos en una pantalla de 390px dejaría 150px para una tabla de nueve
 * columnas, que no es una versión reducida sino una pantalla rota.
 *
 * El cajón se cierra al navegar, porque quedarse abierto tapando la página a la
 * que acabas de ir es el error clásico de este patrón.
 */
export function AdminShell({
  items,
  breadcrumb,
  userLabel,
  userInitials,
  labels,
  children,
}: {
  items: readonly AdminNavItem[];
  breadcrumb: string;
  userLabel: string;
  userInitials: string;
  labels: { openMenu: string; closeMenu: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const tNav = useTranslations("admin.nav");

  // Segunda miga: la sección en la que estamos, tomada del mismo registro que
  // resalta la barra lateral.
  const current = activeAdminItem(items, pathname);

  // Cerrar al navegar.
  useEffect(() => setOpen(false), [pathname]);

  // Con el cajón abierto el fondo no debe desplazarse detrás de él.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape cierra, como cualquier capa modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Barra lateral fija — solo desde lg. */}
      <div className="hidden lg:flex">
        <AdminSidebar items={items} />
      </div>

      {/* Cajón móvil. */}
      <div
        className={clsx(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label={labels.closeMenu}
          onClick={() => setOpen(false)}
          className={clsx(
            "absolute inset-0 bg-bg/80 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={clsx(
            "absolute inset-y-0 left-0 flex transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <AdminSidebar items={items} inDrawer />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={labels.openMenu}
            aria-expanded={open}
            className="-ml-1 rounded-control p-2 text-text-secondary hover:bg-surface-elevated hover:text-text-primary lg:hidden"
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>

          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="shrink-0 text-text-muted">{breadcrumb}</span>
            {current && (
              <>
                <ChevronRight size={14} aria-hidden className="shrink-0 text-text-muted" />
                <span aria-current="page" className="truncate text-text-primary">
                  {tNav(current.key)}
                </span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* El correo se esconde en móvil: la inicial ya identifica la sesión. */}
            <span className="hidden truncate text-sm text-text-secondary sm:inline">
              {userLabel}
            </span>
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-elevated text-xs font-medium text-text-primary"
            >
              {userInitials}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
