import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CarIllustration } from "@/components/ui/CarIllustration";
import { Flag } from "@/components/ui/Flag";
import { regionOfCountry } from "@/config/sourcing-regions";
import { parametersDeps, quotingRepositories } from "@/composition/container";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";
import { liquidate, type CostBlock } from "@/modules/pricing";
import { assembleInput } from "@/modules/quoting";

/**
 * Ficha del vehículo.
 *
 * No repite un precio guardado: LIQUIDA de verdad, con el mismo motor que usa
 * el simulador y que emite la cotización. Por eso el desglose que se ve aquí y
 * el del PDF no pueden diferir — son el mismo cálculo, no dos implementaciones
 * que alguien tiene que mantener de acuerdo.
 */

const UNITS_PER_CONTAINER = 3;

const BLOCK_ORDER: readonly CostBlock[] = [
  "ORIGIN",
  "FREIGHT",
  "TAX",
  "DESTINATION",
  "ADDON",
  "COMMERCIAL",
];

interface Breakdown {
  block: CostBlock;
  amountCop: number;
}

async function priceVehicle(
  vehicleId: string,
): Promise<{ totalCop: number; blocks: Breakdown[] } | null> {
  try {
    const now = new Date();
    const activeSet = await parametersDeps.sets.active(now);
    if (!activeSet) return null;

    const ports = await quotingRepositories.ports.all();
    const vehicle = await quotingRepositories.vehicles.byId(vehicleId);
    if (!vehicle?.originPortId) return null;

    for (const port of ports.filter((candidate) => candidate.isDestination)) {
      const modes = await quotingRepositories.freight.modesForRoute(
        activeSet.id,
        vehicle.originPortId,
        port.id,
        now,
      );
      if (modes.length === 0) continue;

      const input = await assembleInput(quotingRepositories, activeSet, {
        vehicleId,
        destinationPortId: port.id,
        ...(modes[0] ? { mode: modes[0] } : {}),
        unitsInContainer: UNITS_PER_CONTAINER,
        commercialMethod: "BY_CIF_VALUE",
        taxableBaseMethod: "BY_FOB_VALUE",
        addOnCodes: [],
        importerIsEndConsumer: true,
        hasOriginCertificate: false,
        on: now,
      });

      const result = liquidate(input);
      const totals = new Map<CostBlock, number>();
      for (const line of result.lineItems) {
        if (line.isSubtotal) continue;
        totals.set(line.block, (totals.get(line.block) ?? 0) + line.amountCop.toNumber());
      }

      return {
        totalCop: result.totalCop.toNumber(),
        blocks: BLOCK_ORDER.filter((block) => (totals.get(block) ?? 0) !== 0).map((block) => ({
          block,
          amountCop: totals.get(block) ?? 0,
        })),
      };
    }
    return null;
  } catch {
    // La ficha debe abrir aunque el cálculo falle: se muestra sin desglose.
    return null;
  }
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");
  const pricing = await getTranslations("pricing");
  const common = await getTranslations("common");

  const row = await prisma.vehicle
    .findUnique({
      where: { slug },
      select: {
        id: true,
        modelYear: true,
        powertrain: true,
        bodyType: true,
        originCountryCode: true,
        mileageKm: true,
        exteriorColor: true,
        condition: true,
        trim: {
          select: {
            name: true,
            model: { select: { name: true, brand: { select: { name: true } } } },
          },
        },
        images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    })
    .catch(() => null);

  if (!row) notFound();

  const label = `${row.trim.model.brand.name} ${row.trim.model.name} ${row.trim.name}`;
  const priced = await priceVehicle(row.id);

  const intl = locale === "es" ? "es-CO" : "en-US";
  const cop = (value: number) =>
    `COP ${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(value)}`;
  const regionNames = new Intl.DisplayNames([intl], { type: "region" });

  const specs: { label: string; value: string }[] = [
    { label: t("catalog.filters.year"), value: String(row.modelYear) },
    {
      label: t("catalog.filters.powertrain"),
      value: common(`motorization.${row.powertrain === "BEV" ? "EV" : row.powertrain}`),
    },
    { label: t("catalog.filters.bodyType"), value: row.bodyType },
    {
      label: t("catalog.filters.origin"),
      value: regionNames.of(row.originCountryCode) ?? row.originCountryCode,
    },
  ];

  return (
    <>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={13} aria-hidden />
          {t("catalog.detail.backToCatalog")}
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-tile bg-plate">
              {row.images[0] ? (
                <img
                  src={row.images[0].url}
                  alt={row.images[0].alt ?? label}
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <CarIllustration
                  bodyType={row.bodyType}
                  className="aspect-[16/10] w-full px-10 py-6"
                />
              )}
            </div>

            <section className="mt-6">
              <h2 className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
                {t("catalog.detail.specs")}
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="rounded-card border border-border bg-surface px-3 py-2.5"
                  >
                    <dt className="text-[0.6875rem] text-text-muted">{spec.label}</dt>
                    <dd className="mt-0.5 text-sm text-text-primary">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-card border border-border bg-surface-elevated p-5">
              <p className="flex items-center gap-2 text-xs text-text-muted">
                <Flag
                  code={regionOfCountry(row.originCountryCode)?.flagCode ?? row.originCountryCode}
                  className="rounded-[2px]"
                />
                <span data-numeric>{row.modelYear}</span>
              </p>

              <h1 className="mt-2 font-display text-2xl leading-tight font-semibold text-text-primary">
                {label}
              </h1>

              <p className="mt-5 text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
                {t("catalog.landedLabel")}
              </p>
              <p
                className="font-display text-[2.25rem] leading-none font-semibold text-accent"
                data-numeric
              >
                {priced ? cop(priced.totalCop) : t("catalog.notPriced")}
              </p>

              <Link
                href="/simulador"
                className="mt-5 inline-flex w-full items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
              >
                {t("catalog.detail.requestQuote")}
              </Link>
            </div>

            {priced && (
              <section className="mt-4 rounded-card border border-border bg-surface p-5">
                <h2 className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
                  {t("catalog.detail.costTitle")}
                </h2>
                <ul className="mt-3 divide-y divide-border">
                  {priced.blocks.map((entry) => (
                    <li
                      key={entry.block}
                      className="flex items-baseline justify-between py-2"
                    >
                      <span className="text-sm text-text-secondary">
                        {pricing(`blocks.${entry.block}`)}
                      </span>
                      <span className="text-sm text-text-primary" data-numeric>
                        {cop(entry.amountCop)}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-baseline justify-between pt-2.5">
                    <span className="text-sm font-medium text-text-primary">
                      {pricing("proration.total")}
                    </span>
                    <span className="text-sm font-semibold text-accent" data-numeric>
                      {cop(priced.totalCop)}
                    </span>
                  </li>
                </ul>
              </section>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
