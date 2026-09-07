import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StatCard } from "@/components/ui/StatCard";
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

/** Nosotros. Las cifras salen de la base, así que envejecen solas. */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");
  const common = await getTranslations("common");

  const [markets, vehicles] = await Promise.all([
    prisma.port.count({ where: { isOrigin: true, active: true } }).catch(() => 0),
    prisma.vehicle.count({ where: { isPublished: true } }).catch(() => 0),
  ]);

  return (
    <>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <PageIntro title={t("about.title")} subtitle={t("about.subtitle")} />

        <section className="mt-10 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-display text-xl font-semibold text-text-primary">
              {t("about.bodyTitle")}
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-text-secondary">
              {t("about.body")}
            </p>
            <Link
              href="/como-trabajamos"
              className="mt-6 inline-flex rounded-control border border-border-strong px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-elevated"
            >
              {t("howItWorks.title")}
            </Link>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-5">
            <StatCard
              label={t("home.stats.markets")}
              value={String(markets)}
              tone="accent"
            />
            <StatCard label={t("catalog.title")} value={String(vehicles)} />
            <StatCard label={t("home.stats.timeline")} value="72" hint={common("brand")} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
