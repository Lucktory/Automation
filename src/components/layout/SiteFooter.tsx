import { getTranslations } from "next-intl/server";
import { PUBLIC_NAV } from "@/config/navigation";
import { Logo } from "@/components/ui/Logo";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { Link } from "@/i18n/navigation";

/**
 * Pie del sitio público.
 *
 * Lleva el descargo sobre las cifras de tributos, que no es decorativo: la
 * liquidación definitiva la hace la autoridad aduanera, y decirlo en cada
 * página es lo que separa una estimación honesta de una promesa que no podemos
 * cumplir.
 *
 * No va en la envoltura `(public)` porque el simulador ocupa exactamente el
 * alto de la ventana; un pie después de él rompería esa cuenta. Lo usan las
 * páginas de contenido, que sí crecen hacia abajo.
 */

/** Enlaces legales. Las rutas existen: `/legal/[slug]` las sirve. */
const LEGAL = [
  { key: "terms", slug: "terminos" },
  { key: "privacy", slug: "privacidad" },
  { key: "notice", slug: "habeas-data" },
] as const;

const COMPANY = [
  { key: "about", href: "/nosotros" },
  { key: "contact", href: "/contacto" },
  { key: "faq", href: "/faq" },
] as const;

/**
 * Perfiles sociales. Apuntan al sitio de cada red porque el cliente todavía no
 * ha entregado sus cuentas; se cambian aquí y en ningún otro sitio.
 */
const SOCIAL = [
  { key: "linkedin", href: "https://www.linkedin.com/" },
  { key: "instagram", href: "https://www.instagram.com/" },
  { key: "youtube", href: "https://www.youtube.com/" },
] as const;

export async function SiteFooter() {
  const t = await getTranslations("site");
  const common = await getTranslations("common");
  const year = new Date().getFullYear();

  const column = "text-[0.8125rem] text-text-secondary transition-colors hover:text-text-primary";

  return (
    <footer className="mt-14 border-t border-border bg-surface">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Logo variant="full" height={34} />
          </div>

          <nav aria-label={t("footer.product")} className="lg:col-span-2">
            <p className="text-[0.8125rem] font-semibold text-text-primary">
              {t("footer.product")}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {PUBLIC_NAV.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className={column}>
                    {common(`nav.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t("footer.company")} className="lg:col-span-2">
            <p className="text-[0.8125rem] font-semibold text-text-primary">
              {t("footer.company")}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {COMPANY.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className={column}>
                    {t(`${item.key === "about" ? "about" : item.key}.title`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t("footer.legal")} className="lg:col-span-2">
            <p className="text-[0.8125rem] font-semibold text-text-primary">
              {t("footer.legal")}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {LEGAL.map((item) => (
                <li key={item.key}>
                  <Link
                    href={{ pathname: "/legal/[slug]", params: { slug: item.slug } }}
                    className={column}
                  >
                    {t(`footer.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3 lg:border-l lg:border-border lg:pl-8">
            <ul className="flex gap-3" aria-label={t("footer.social")}>
              {SOCIAL.map(({ key, href }) => (
                <li key={key}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key}
                    className="grid size-8 place-items-center rounded-control text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary"
                  >
                    <SocialIcon name={key} />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-text-muted">
              {t("footer.disclaimer")}
            </p>
            <p className="mt-3 text-xs text-text-muted">
              © {year} {common("brand")}. {t("footer.rights")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
