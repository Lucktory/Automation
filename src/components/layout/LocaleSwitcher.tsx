"use client";

import { useParams } from "next/navigation";
import clsx from "clsx";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";

/**
 * Conmutador de idioma, como control segmentado.
 *
 * Conserva la ruta actual: `usePathname` de next-intl devuelve la CLAVE de ruta
 * (`/simulador`), no el segmento traducido, así que el enlace al otro idioma
 * resuelve a `/en/import-calculator` sin que este componente sepa nada de esa
 * traducción. Cambiar de idioma nunca debe devolver al usuario a la portada.
 */
export function LocaleSwitcher({
  current,
  labels,
  ariaLabel,
}: {
  current: Locale;
  labels: Record<Locale, string>;
  ariaLabel: string;
}) {
  const pathname = usePathname();
  const params = useParams();

  return (
    <div
      className="inline-flex rounded-control border border-border p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {LOCALES.map((locale) => {
        const isCurrent = locale === current;
        return (
          <Link
            key={locale}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- la ruta activa puede ser dinámica; sus params viajan tal cual. */
            href={{ pathname, params } as any}
            locale={locale}
            hrefLang={locale}
            aria-current={isCurrent ? "true" : undefined}
            className={clsx(
              "rounded-[calc(var(--shape-control)-2px)] px-2.5 py-1 text-xs font-medium transition-colors",
              isCurrent
                ? "bg-surface-elevated text-text-primary"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            {labels[locale]}
          </Link>
        );
      })}
    </div>
  );
}
