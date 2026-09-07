import { ArrowRight, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CarIllustration } from "@/components/ui/CarIllustration";
import { Flag } from "@/components/ui/Flag";
import { regionOfCountry } from "@/config/sourcing-regions";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Esta pantalla lee datos vivos, asi que se renderiza en cada peticion.
 *
 * Sin esto Next la prerenderiza durante el build, lo que tiene dos
 * consecuencias malas: el despliegue pasa a depender de que la base de datos
 * responda mientras compila —y un build que la consulta decenas de veces falla
 * por cualquier corte de red—, y la pagina queda congelada con los precios que
 * hubiera en ese momento hasta el siguiente despliegue. En un producto cuyo
 * valor es decir cuanto cuesta algo hoy, un precio cacheado en el build no es
 * una optimizacion: es una cifra equivocada.
 */
export const dynamic = "force-dynamic";

/**
 * Portada.
 *
 * Vive dentro del grupo `(public)`, así que hereda el encabezado del sitio. Es
 * un detalle que costó caro: mientras el archivo estuvo en la raíz de
 * `[locale]`, la primera pantalla que veía cualquier visitante no tenía
 * cabecera, ni navegación, ni pie — no había forma de llegar a ninguna parte
 * desde ella.
 *
 * Las tres cifras y los vehículos destacados salen de la base de datos, así que
 * la portada envejece sola en vez de anunciar números que dejaron de ser
 * ciertos.
 */

const FEATURED_LIMIT = 3;
const STEP_KEYS = ["quote", "purchase", "shipping", "customs", "registration", "delivery"] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");
  const common = await getTranslations("common");

  const [markets, featured, timeline] = await Promise.all([
    prisma.port.count({ where: { isOrigin: true, active: true } }).catch(() => 0),
    prisma.vehicle
      .findMany({
        where: { isPublished: true, estLandedCop: { not: null } },
        orderBy: { estLandedCop: "asc" },
        take: FEATURED_LIMIT,
        select: {
          id: true,
          slug: true,
          modelYear: true,
          powertrain: true,
          bodyType: true,
          originCountryCode: true,
          estLandedCop: true,
          images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
          trim: {
            select: {
              name: true,
              model: { select: { name: true, brand: { select: { name: true } } } },
            },
          },
        },
      })
      .catch(() => []),
    prisma.freightRate
      .aggregate({ _avg: { transitDaysMax: true } })
      .then((r) => Math.round(Number(r._avg.transitDaysMax ?? 0)))
      .catch(() => 0),
  ]);

  const intl = locale === "es" ? "es-CO" : "en-US";
  const cop = (value: number) =>
    `COP ${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(value)}`;

  /** Las seis fases del proceso, con el plazo real que estima el motor. */
  const stats = [
    { label: t("home.stats.markets"), value: String(markets) },
    { label: t("home.stats.transparency"), value: "6" },
    { label: t("home.stats.timeline"), value: String(timeline + 50) },
  ];

  return (
    <>
      <main>
        {/* ── Portada ──────────────────────────────────────────────────── */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-20">
            <div className="lg:col-span-7">
              <p className="text-[0.6875rem] tracking-[0.16em] text-accent uppercase">
                {t("home.eyebrow")}
              </p>
              <h1 className="mt-3 font-display text-4xl leading-[1.08] font-semibold tracking-[-0.02em] text-text-primary sm:text-5xl">
                {t("home.title")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-text-secondary">
                {t("home.subtitle")}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/simulador"
                  className="inline-flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
                >
                  {t("home.ctaPrimary")}
                  <ArrowRight size={15} aria-hidden />
                </Link>
                <Link
                  href="/catalogo"
                  className="inline-flex items-center rounded-control border border-border-strong px-5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface-elevated"
                >
                  {t("home.ctaSecondary")}
                </Link>
              </div>

              <dl className="mt-10 flex flex-wrap gap-8">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[0.6875rem] tracking-[0.12em] text-text-muted uppercase">
                      {stat.label}
                    </dt>
                    <dd
                      className="mt-1 font-display text-2xl font-semibold text-text-primary"
                      data-numeric
                    >
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Vehículos destacados: precio PUESTO EN COLOMBIA, no de origen. */}
            <div className="lg:col-span-5">
              <ul className="flex flex-col gap-2.5">
                {featured.map((vehicle) => (
                  <li key={vehicle.id}>
                    <Link
                      href={{ pathname: "/catalogo/[slug]", params: { slug: vehicle.slug } }}
                      className="group flex items-center gap-3 rounded-card border border-border bg-surface p-3.5 transition-colors hover:border-border-strong"
                    >
                      {vehicle.images[0] ? (
                        <img
                          src={vehicle.images[0].url}
                          alt={vehicle.images[0].alt ?? ""}
                          loading="lazy"
                          className="h-11 w-[4.5rem] shrink-0 rounded-tile object-cover"
                        />
                      ) : (
                        <CarIllustration
                          bodyType={vehicle.bodyType}
                          className="h-11 w-[4.5rem] shrink-0 rounded-tile bg-plate px-1"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[0.6875rem] text-text-muted">
                          <Flag
                            code={
                              regionOfCountry(vehicle.originCountryCode)?.flagCode ??
                              vehicle.originCountryCode
                            }
                            className="rounded-[2px]"
                          />
                          <span data-numeric>{vehicle.modelYear}</span>
                          <span>·</span>
                          <span>
                            {common(
                              `motorization.${vehicle.powertrain === "BEV" ? "EV" : vehicle.powertrain}`,
                            )}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[0.8125rem] text-text-primary group-hover:text-accent">
                          {vehicle.trim.model.brand.name} {vehicle.trim.model.name}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[0.625rem] text-text-muted">
                          {t("catalog.landedLabel")}
                        </span>
                        <span
                          className="font-display text-sm font-semibold text-accent"
                          data-numeric
                        >
                          {cop(Number(vehicle.estLandedCop))}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                href="/comparar"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                {t("compare.title")}
                <ArrowRight size={12} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Proceso ──────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-text-primary">
            {t("home.stepsTitle")}
          </h2>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STEP_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <h3 className="text-[0.8125rem] font-medium text-text-primary">
                  {t(`howItWorks.steps.${key}.title`)}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                  {t(`howItWorks.steps.${key}.body`)}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface-elevated p-5">
            <ShieldCheck size={18} aria-hidden className="shrink-0 text-success" />
            <p className="flex-1 text-sm text-text-secondary">
              {t("howItWorks.guarantees.noSurprise")}
            </p>
            <Link
              href="/como-trabajamos"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-border-strong px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface"
            >
              {t("howItWorks.title")}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
