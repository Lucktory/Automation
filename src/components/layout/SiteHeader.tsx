import { UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PUBLIC_NAV } from "@/config/navigation";
import { Logo } from "@/components/ui/Logo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NavLink } from "./NavLink";

/**
 * Encabezado fijo del sitio público.
 *
 * No nombra ninguna sección: recorre `PUBLIC_NAV`. Agregar una entrada al menú
 * es agregar un objeto al registro, nunca editar este archivo.
 *
 * Es `sticky` y no `fixed` a propósito: `fixed` obliga a cada página a reservar
 * el alto del encabezado por su cuenta, y basta con que una lo olvide para que
 * el título quede tapado.
 */
export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-[1440px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" aria-label={t("brand")} className="shrink-0">
          <Logo variant="full" height={34} priority />
        </Link>

        {/* La navegación va centrada y con subrayado en la sección actual: en un
            sitio de cuatro secciones, saber dónde estás vale más que el ahorro
            de espacio de alinearla a un lado. */}
        <nav aria-label={t("nav.label")} className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-9">
            {PUBLIC_NAV.map((item) => (
              <li key={item.key}>
                <NavLink href={item.href}>{t(`nav.${item.key}`)}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <LocaleSwitcher
            current={locale}
            labels={{ es: t("language.es"), en: t("language.en") }}
            ariaLabel={t("language.label")}
          />

          <Link
            href="/simulador"
            className="hidden rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover sm:inline-flex"
          >
            {t("actions.simulate")}
          </Link>

          <Link
            href="/portal"
            aria-label={t("nav.account")}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            <UserRound size={17} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
