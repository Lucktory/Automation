import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { parametersDeps, quotingRepositories } from "@/composition/container";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";
import { liquidate } from "@/modules/pricing";
import { assembleInput } from "@/modules/quoting";
import { CheckoutClient, type CheckoutAddOn } from "./CheckoutClient";

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
 * Reserva.
 *
 * El resumen liquida con el motor, no con cifras de maqueta, y los servicios
 * adicionales salen del catálogo de productos con sus precios reales. Un
 * checkout con números inventados es justo la pantalla donde un cliente atento
 * nota que el resto tampoco cuadra.
 *
 * El cobro no está conectado: eso exige una pasarela y credenciales del cliente.
 */

const UNITS_PER_CONTAINER = 3;

async function loadSummary(locale: string) {
  try {
    const now = new Date();
    const activeSet = await parametersDeps.sets.active(now);
    if (!activeSet) return null;

    const vehicles = await quotingRepositories.vehicles.publishedForQuote(1);
    const vehicle = vehicles[0];
    if (!vehicle?.originPortId) return null;

    const ports = await quotingRepositories.ports.all();
    const port = ports.find((candidate) => candidate.isDestination);
    if (!port) return null;

    const modes = await quotingRepositories.freight.modesForRoute(
      activeSet.id,
      vehicle.originPortId,
      port.id,
      now,
    );

    const input = await assembleInput(quotingRepositories, activeSet, {
      vehicleId: vehicle.id,
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

    const products = await prisma.addOnProduct.findMany({
      where: { active: true, parameterSetId: activeSet.id },
      orderBy: { sortOrder: "asc" },
      select: {
        code: true,
        labelEs: true,
        labelEn: true,
        price: true,
        currency: true,
        category: true,
      },
    });

    /**
     * Solo se ofrecen los extras en pesos. Un accesorio cotizado en dólares
     * tendría que convertirse con la TRM y esa conversión pertenece al motor,
     * no a una pantalla de venta.
     */
    const addOns: CheckoutAddOn[] = products
      .filter((product) => product.currency === "COP")
      .map((product) => ({
        code: product.code,
        label: locale === "es" ? product.labelEs : product.labelEn,
        priceCop: Number(product.price),
        category: product.category,
      }));

    return {
      label: vehicle.label,
      totalCop: result.totalCop.toNumber(),
      depositCop: input.commercial.depositCop,
      addOns,
    };
  } catch {
    return null;
  }
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");
  const pricing = await getTranslations("pricing");

  const summary = await loadSummary(locale);

  return (
    <>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <PageIntro title={t("checkout.title")} subtitle={t("checkout.subtitle")} />

        <div className="mt-8">
          {summary === null ? (
            <p className="text-sm text-text-muted">{pricing("simulator.notQuotable")}</p>
          ) : (
            <CheckoutClient
              vehicleLabel={summary.label}
              baseTotalCop={summary.totalCop}
              depositCop={summary.depositCop}
              addOns={summary.addOns}
              locale={locale}
              labels={{
                summary: t("checkout.summary"),
                addOnsTitle: t("checkout.addOnsTitle"),
                landedLabel: pricing("landedCost.label"),
                addOnsTotal: t("checkout.addOnsTotal"),
                total: t("checkout.total"),
                depositLabel: t("checkout.depositLabel"),
                balanceLabel: t("checkout.balanceLabel"),
                payDeposit: t("checkout.payDeposit"),
                secureNote: t("checkout.secureNote"),
                reserved: t("checkout.reserved"),
                reservedNote: t("checkout.reservedNote"),
              }}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
