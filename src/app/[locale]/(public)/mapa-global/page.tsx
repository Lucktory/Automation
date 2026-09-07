import { Info } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Flag } from "@/components/ui/Flag";
import { prisma } from "@/infra/db/prisma";
import { SOURCING_REGIONS, regionOfCountry } from "@/config/sourcing-regions";
import type { Locale } from "@/i18n/routing";

/**
 * Mapa global.
 *
 * Las rutas salen de las TARIFAS DE FLETE reales, no de una lista escrita a
 * mano: si mañana el administrador carga una ruta nueva, aparece aquí sola. Los
 * días de tránsito que se muestran son los mismos que el motor usa para estimar
 * el plazo de entrega, así que la página comercial y el cálculo no pueden
 * contradecirse.
 */

interface RouteRow {
  id: string;
  origin: string;
  originCountry: string;
  destination: string;
  mode: string;
  transitMin: number;
  transitMax: number;
}

async function loadRoutes(): Promise<RouteRow[]> {
  try {
    const rows = await prisma.freightRate.findMany({
      where: { validTo: null },
      orderBy: { transitDaysMax: "asc" },
      select: {
        id: true,
        mode: true,
        transitDaysMin: true,
        transitDaysMax: true,
        originPort: { select: { name: true, countryCode: true } },
        destinationPort: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      origin: row.originPort.name,
      originCountry: row.originPort.countryCode,
      destination: row.destinationPort.name,
      mode: row.mode,
      transitMin: row.transitDaysMin,
      transitMax: row.transitDaysMax,
    }));
  } catch {
    // Una consulta fallida no puede tumbar una página de contenido.
    return [];
  }
}

export default async function GlobalMapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");

  const routes = await loadRoutes();
  const regionNames = new Intl.DisplayNames([locale === "es" ? "es-CO" : "en-US"], {
    type: "region",
  });

  /** Solo se muestran los mercados que de verdad tienen ruta cargada. */
  const activeRegions = SOURCING_REGIONS.filter((region) =>
    routes.some((route) => region.countryCodes.includes(route.originCountry)),
  );

  const daysLabel = (min: number, max: number) =>
    t("globalMap.days", { min, max });

  return (
    <>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <PageIntro title={t("globalMap.title")} subtitle={t("globalMap.subtitle")} />

        <section className="mt-10">
          <h2 className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
            {t("globalMap.marketsTitle")}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {activeRegions.map((region) => {
              const count = routes.filter((route) =>
                region.countryCodes.includes(route.originCountry),
              ).length;
              return (
                <li
                  key={region.key}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
                >
                  <Flag code={region.flagCode} className="shrink-0 rounded-[2px]" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text-primary">
                      {regionNames.of(region.flagCode) ?? region.key}
                    </span>
                    <span className="text-xs text-text-muted" data-numeric>
                      {count}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
            {t("globalMap.routesTitle")}
          </h2>

          <div className="mt-4 overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase">
                    {t("globalMap.columns.route")}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase">
                    {t("globalMap.columns.mode")}
                  </th>
                  <th className="px-4 py-2.5 text-right text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase">
                    {t("globalMap.columns.transit")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => (
                  <tr key={route.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <Flag
                          code={regionOfCountry(route.originCountry)?.flagCode ?? route.originCountry}
                          className="shrink-0 rounded-[2px]"
                        />
                        <span className="text-text-primary">
                          {route.origin} → {route.destination}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{route.mode}</td>
                    <td className="px-4 py-2.5 text-right text-text-primary" data-numeric>
                      {daysLabel(route.transitMin, route.transitMax)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 flex items-start gap-2 rounded-card border border-border bg-surface-elevated p-4 text-sm text-text-secondary">
            <Info size={15} aria-hidden className="mt-0.5 shrink-0 text-accent" />
            {t("globalMap.tlcNote")}
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
