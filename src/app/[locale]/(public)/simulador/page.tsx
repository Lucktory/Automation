import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrmBadge } from "@/components/admin/TrmBadge";
import { parametersDeps, quotingRepositories } from "@/composition/container";
import { optionalMessage } from "@/i18n/lookup";
import type { Locale } from "@/i18n/routing";
import {
  assembleInput,
  FreightRateNotFoundError,
  TariffRuleNotFoundError,
} from "@/modules/quoting";
import { SimulatorClient } from "./SimulatorClient";

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
 * Simulador de importación.
 *
 * El servidor ensambla la entrada desde la base de datos UNA vez; a partir de
 * ahí el navegador recalcula solo, porque el motor es puro. La cotización
 * oficial usará el mismo ensamblaje, así que las dos cifras coinciden por
 * construcción y no por disciplina.
 */

const DEFAULT_UNITS = 3;
const VEHICLE_LIMIT = 50;

export default async function SimulatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ vehiculo?: string; puerto?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const sp = await searchParams;
  const t = await getTranslations("pricing");
  const now = new Date();

  const activeSet = await parametersDeps.sets.active(now);
  const vehicles = await quotingRepositories.vehicles.publishedForQuote(VEHICLE_LIMIT);
  const ports = await quotingRepositories.ports.all();
  const destination = ports.find((p) => p.isDestination);

  const unavailable = (detail: string) => (
    <main className="mx-auto max-w-3xl px-5 py-16 text-center">
      <h1 className="font-display text-xl text-text-primary">{t("simulator.title")}</h1>
      <p className="mt-3 text-sm text-text-muted">{t("simulator.notQuotable")}</p>
      <p className="mt-1 text-xs text-text-muted">{detail}</p>
    </main>
  );

  if (!activeSet || vehicles.length === 0 || !destination) {
    return unavailable("");
  }

  const vehicle =
    vehicles.find((candidate) => candidate.slug === sp.vehiculo) ?? vehicles[0]!;
  const port = ports.find((p) => p.unlocode === sp.puerto) ?? destination;

  const modes = vehicle.originPortId
    ? await quotingRepositories.freight.modesForRoute(
        activeSet.id,
        vehicle.originPortId,
        port.id,
        now,
      )
    : [];

  let input;
  try {
    input = await assembleInput(quotingRepositories, activeSet, {
      vehicleId: vehicle.id,
      destinationPortId: port.id,
      ...(modes[0] ? { mode: modes[0] } : {}),
      unitsInContainer: DEFAULT_UNITS,
      commercialMethod: "BY_CIF_VALUE",
      taxableBaseMethod: "BY_FOB_VALUE",
      addOnCodes: [],
      importerIsEndConsumer: true,
      hasOriginCertificate: false,
      on: now,
    });
  } catch (error) {
    if (
      error instanceof FreightRateNotFoundError ||
      error instanceof TariffRuleNotFoundError
    ) {
      return unavailable(error.message);
    }
    throw error;
  }

  const dict = (prefix: string, keys: readonly string[]) =>
    Object.fromEntries(keys.map((key) => [key, t(`${prefix}.${key}`)]));

  const stageCodes = input.destination
    .map((rule) => `DESTINATION.${rule.code}`)
    .concat([
      "ORIGIN.PURCHASE",
      "ORIGIN.AUCTION_FEE",
      "ORIGIN.BUYER_FEE",
      "ORIGIN.INLAND",
      "ORIGIN.EXPORT_DOCS",
      "FREIGHT.OCEAN",
      "FREIGHT.SURCHARGES",
      "FREIGHT.INSURANCE",
      "FREIGHT.CIF",
      "FREIGHT.FOB",
      "TAX.ARANCEL",
      "TAX.IMPOCONSUMO",
      "TAX.IVA",
      "COMMERCIAL.MARGIN",
      "COMMERCIAL.SERVICE_FEE",
      "COMMERCIAL.PAYMENT",
      "COMMERCIAL.GMF",
    ]);

  /**
   * Etiquetas y notas de cada línea.
   *
   * Se resuelven contra el catálogo directamente y NO con `t()` envuelto en un
   * try/catch: `t()` no lanza cuando falta una clave —devuelve el centinela
   * ⟨pricing.notes.X⟩—, así que el catch nunca se dispara y el símbolo acaba
   * impreso en la pantalla. Las reglas de destino las crea el administrador, de
   * modo que muchas no tienen nota, y eso es normal: se omite la nota.
   */
  const stageLabels = Object.fromEntries(
    stageCodes.map((code) => [
      code,
      optionalMessage(locale, `pricing.stages.${code}`) ?? code,
    ]),
  );

  const stageNotes = Object.fromEntries(
    stageCodes.flatMap((code) => {
      const note = optionalMessage(locale, `pricing.notes.${code}`);
      return note === null ? [] : [[code, note]];
    }),
  );

  /** Solo lo que el selector necesita: no viaja al cliente el costo de compra. */
  const pickable = vehicles.map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    modelYear: candidate.modelYear,
    originCountry: candidate.originCountry,
    powertrain: candidate.powertrain,
    imageUrl: candidate.imageUrl,
    originPortId: candidate.originPortId,
  }));

  return (
    /* El alto de la ventana menos el encabezado del sitio (4rem). En escritorio
       la página no crece: los paneles se desplazan por dentro, y el diseño
       entra en una sola vista. Por debajo de `lg` vuelve al flujo normal. */
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-2.5 px-4 py-3 sm:px-5 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[1.375rem] leading-tight font-semibold text-text-primary">
          {t("simulator.title")}
        </h1>
        <TrmBadge
          rate={input.fx.trmCommercial}
          date={new Date(`${input.fx.trmDate}T00:00:00Z`)}
          source={input.fx.trmSource}
          ageDays={input.fx.trmAgeDays}
          staleAfterDays={1}
          locale={locale}
          labels={{
            prefix: t("trm.label"),
            source: {
              AUTO: t("trm.source.AUTO"),
              MANUAL: t("trm.source.MANUAL"),
              CACHE: t("trm.source.CACHE"),
            },
          }}
        />
      </div>

      <SimulatorClient
        initialInput={input}
        initialModes={modes}
        parameterSet={{ id: activeSet.id, version: activeSet.version }}
        vehicles={pickable}
        ports={ports.map((p) => ({
          id: p.id,
          unlocode: p.unlocode,
          name: p.name,
          countryCode: p.countryCode,
          isOrigin: p.isOrigin,
          isDestination: p.isDestination,
        }))}
        locale={locale}
        labels={{
          params: t("simulator.params"),
          sections: dict("simulator.sections", [
            "vehicle",
            "origin",
            "freight",
            "consolidation",
            "nationalization",
            "commercial",
          ]),
          usingDefaults: t("simulator.usingDefaults"),
          modifiedCount: t.raw("simulator.modifiedCount") as string,
          blocks: dict("blocks", [
            "ORIGIN",
            "FREIGHT",
            "TAX",
            "DESTINATION",
            "ADDON",
            "COMMERCIAL",
          ]),
          stageLabels,
          stageNotes,
          landedCostLabel: t("landedCost.label"),
          breakdownTitle: t("breakdown.title"),
          waterfallTitle: t("breakdown.waterfallTitle"),
          totalLabel: t("proration.total"),
          fields: dict("simulator", [
            "originCountry",
            "entryPort",
            "purchasePrice",
            "auctionFee",
            "inlandFreight",
            "exportDocs",
            "transportMode",
            "containerCost",
            "surcharges",
            "insuranceRate",
            "unitsPerContainer",
            "prorationMethod",
            "portDays",
            "marginRate",
            "importerIsEndConsumer",
            "importerHint",
            "hasOriginCertificate",
            "certificateHint",
          ]),
          modified: t("simulator.modified"),
          reset: t("simulator.reset"),
          containerSplit: t.raw("simulator.containerSplit") as string,
          columns: dict("simulator.columns", [
            "index",
            "vehicle",
            "share",
            "allocated",
          ]) as { index: string; vehicle: string; share: string; allocated: string },
          residueLabel: t("proration.residue"),
          residueNote: t("simulator.residueNote"),
          timelineTitle: t("timeline.title"),
          timelineTotal: t.raw("timeline.total") as string,
          phases: dict("timeline.phases", [
            "PURCHASE",
            "ORIGIN",
            "OCEAN",
            "PORT",
            "NATIONALIZATION",
            "REGISTRATION",
          ]),
          actions: dict("simulator.actions", ["pdf", "save", "email"]) as {
            pdf: string;
            save: string;
            email: string;
          },
          notQuotable: t("simulator.notQuotable"),
          ceiling: t.raw("simulator.ceiling") as string,
          prorationMethods: dict("proration.method", [
            "EQUAL",
            "BY_CIF_VALUE",
            "BY_FOB_VALUE",
            "BY_VOLUME",
            "BY_WEIGHT",
          ]),
          regions: dict("simulator.regions", ["US", "CN", "AE", "EU", "CA"]),
          modes: dict("simulator.modes", ["CONTAINER_40HC", "RORO"]),
          noRateForMode: t("simulator.noRateForMode"),
          noStockForRegion: t("simulator.noStockForRegion"),
          emailing: t("simulator.emailing"),
          emailed: t.raw("simulator.emailed") as string,
          picker: dict("simulator.picker", [
            "change",
            "search",
            "empty",
            "close",
          ]) as { change: string; search: string; empty: string; close: string },
          unitsSummary: t.raw("simulator.unitsSummary") as string,
          fromCountry: t.raw("simulator.fromCountry") as string,
          recalculating: t("simulator.recalculating"),
          saving: t("simulator.saving"),
          saved: t.raw("simulator.saved") as string,
          saveFailed: t.raw("simulator.saveFailed") as string,
          parametersChanged: t("simulator.parametersChanged"),
        }}
      />
    </main>
  );
}
