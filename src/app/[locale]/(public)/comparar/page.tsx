import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EmptyState } from "@/components/ui/EmptyState";
import { Flag } from "@/components/ui/Flag";
import { regionOfCountry } from "@/config/sourcing-regions";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Comparador.
 *
 * La comparación se hace por COSTO PUESTO EN COLOMBIA, no por precio de compra,
 * que es donde aparece el argumento del producto: dos vehículos con FOB parecido
 * pueden separarse cien millones de pesos según su motorización, porque el
 * eléctrico no paga arancel ni impoconsumo.
 *
 * La selección viaja en la URL (?v=slug&v=slug) para que una comparación se
 * pueda compartir por WhatsApp, que es como se comparte de verdad.
 */

const MAX_COMPARE = 3;

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const t = await getTranslations("site");
  const common = await getTranslations("common");

  const requested = sp.v === undefined ? [] : Array.isArray(sp.v) ? sp.v : [sp.v];

  const rows = await prisma.vehicle
    .findMany({
      where:
        requested.length > 0
          ? { slug: { in: requested.slice(0, MAX_COMPARE) } }
          : { isPublished: true },
      // Sin selección explícita se comparan los tres más baratos: la pantalla
      // nunca aparece vacía, y el orden por precio cuenta la historia sola.
      orderBy: { estLandedCop: "asc" },
      take: MAX_COMPARE,
      select: {
        id: true,
        slug: true,
        modelYear: true,
        powertrain: true,
        originCountryCode: true,
        fobUsd: true,
        estLandedCop: true,
        trim: {
          select: {
            name: true,
            model: { select: { name: true, brand: { select: { name: true } } } },
          },
        },
      },
    })
    .catch(() => []);

  const intl = locale === "es" ? "es-CO" : "en-US";
  const cop = (value: number | null) =>
    value === null
      ? "—"
      : `COP ${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(value)}`;
  const usd = (value: number | null) =>
    value === null
      ? "—"
      : `US$ ${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(value)}`;
  const regionNames = new Intl.DisplayNames([intl], { type: "region" });

  const cheapest = rows.reduce<number | null>((min, row) => {
    const value = row.estLandedCop === null ? null : Number(row.estLandedCop);
    if (value === null) return min;
    return min === null || value < min ? value : min;
  }, null);

  return (
    <>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <PageIntro title={t("compare.title")} subtitle={t("compare.subtitle")} />

        {rows.length === 0 ? (
          <div className="mt-8 rounded-card border border-border bg-surface">
            <EmptyState
              title={t("compare.empty")}
              action={
                <Link
                  href="/catalogo"
                  className="inline-flex rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
                >
                  {t("catalog.title")}
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="w-40 px-4 py-3" />
                  {rows.map((row) => (
                    <th key={row.id} scope="col" className="px-4 py-3 text-left">
                      <Link
                        href={{ pathname: "/catalogo/[slug]", params: { slug: row.slug } }}
                        className="text-sm font-medium text-text-primary hover:text-accent"
                      >
                        {row.trim.model.brand.name} {row.trim.model.name}
                      </Link>
                      <span className="block text-xs font-normal text-text-muted">
                        {row.trim.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <th scope="row" className="px-4 py-3 text-left text-xs text-text-muted">
                    {t("compare.rows.landed")}
                  </th>
                  {rows.map((row) => {
                    const value = row.estLandedCop === null ? null : Number(row.estLandedCop);
                    const isBest = value !== null && value === cheapest;
                    return (
                      <td
                        key={row.id}
                        className={
                          isBest
                            ? "px-4 py-3 font-display text-base font-semibold text-accent"
                            : "px-4 py-3 font-display text-base font-semibold text-text-primary"
                        }
                        data-numeric
                      >
                        {cop(value)}
                      </td>
                    );
                  })}
                </tr>

                <tr className="border-b border-border">
                  <th scope="row" className="px-4 py-3 text-left text-xs text-text-muted">
                    {t("compare.rows.fob")}
                  </th>
                  {rows.map((row) => (
                    <td key={row.id} className="px-4 py-3 text-text-secondary" data-numeric>
                      {usd(row.fobUsd === null ? null : Number(row.fobUsd))}
                    </td>
                  ))}
                </tr>

                <tr className="border-b border-border">
                  <th scope="row" className="px-4 py-3 text-left text-xs text-text-muted">
                    {t("compare.rows.powertrain")}
                  </th>
                  {rows.map((row) => (
                    <td key={row.id} className="px-4 py-3 text-text-secondary">
                      {common(
                        `motorization.${row.powertrain === "BEV" ? "EV" : row.powertrain}`,
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="border-b border-border">
                  <th scope="row" className="px-4 py-3 text-left text-xs text-text-muted">
                    {t("compare.rows.origin")}
                  </th>
                  {rows.map((row) => (
                    <td key={row.id} className="px-4 py-3 text-text-secondary">
                      <span className="flex items-center gap-2">
                        <Flag
                          code={
                            regionOfCountry(row.originCountryCode)?.flagCode ??
                            row.originCountryCode
                          }
                          className="rounded-[2px]"
                        />
                        {regionNames.of(row.originCountryCode) ?? row.originCountryCode}
                      </span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <th scope="row" className="px-4 py-3 text-left text-xs text-text-muted">
                    {t("compare.rows.year")}
                  </th>
                  {rows.map((row) => (
                    <td key={row.id} className="px-4 py-3 text-text-secondary" data-numeric>
                      {row.modelYear}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
