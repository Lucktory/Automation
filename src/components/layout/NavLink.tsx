"use client";

import clsx from "clsx";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * Enlace de la navegación principal, con estado activo.
 *
 * Es cliente porque necesita saber en qué ruta está, y `usePathname` de
 * next-intl devuelve la CLAVE de ruta (`/catalogo`), no el segmento traducido.
 * Eso importa: comparando contra la clave, la sección se marca igual en
 * `/es/catalogo` y en `/en/catalog` sin una tabla de equivalencias.
 *
 * El subrayado se dibuja con un pseudo-elemento y no con `border-bottom` para
 * que no empuje el texto ni cambie la altura de la barra al activarse.
 */
export function NavLink({
  href,
  children,
}: {
  href: React.ComponentProps<typeof Link>["href"];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const target = typeof href === "string" ? href : String(href);
  const isActive = pathname === target || pathname.startsWith(`${target}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={clsx(
        "relative py-6 text-sm transition-colors",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:transition-transform",
        isActive
          ? "font-medium text-text-primary after:scale-x-100"
          : "text-text-secondary hover:text-text-primary after:scale-x-0",
      )}
    >
      {children}
    </Link>
  );
}
