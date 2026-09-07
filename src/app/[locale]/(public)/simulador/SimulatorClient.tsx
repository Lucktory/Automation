"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { BreakdownAccordion, type BreakdownGroup } from "@/components/quote/BreakdownAccordion";
import { CostWaterfall, buildWaterfall } from "@/components/quote/CostWaterfall";
import { ProrationTable } from "@/components/quote/ProrationTable";
import { TimelineStrip, type Phase } from "@/components/quote/TimelineStrip";
import { VehiclePicker, type PickableVehicle } from "@/components/quote/VehiclePicker";
import { Button } from "@/components/ui/Button";
import { ChoiceChips, type Choice } from "@/components/ui/ChoiceChips";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Flag } from "@/components/ui/Flag";
import { SOURCING_REGIONS } from "@/config/sourcing-regions";
import { TIMELINE_PHASES } from "@/config/timeline-defaults";
import { liquidate, type CostBlock, type LineItem, type LiquidationInput } from "@/modules/pricing";
import { emailQuoteAction, resimulate, saveQuoteAction } from "./actions";

/**
 * El simulador.
 *
 * Dos velocidades a propósito:
 *
 *   - Mover un número (precio, recargos, margen, unidades) recalcula EN EL
 *     NAVEGADOR. El motor es una función pura sin red ni base de datos, así que
 *     la misma que produce la cotización oficial en el servidor corre aquí en
 *     cada pulsación. Sin ida y vuelta, y sin riesgo de que las dos difieran.
 *
 *   - Cambiar de vehículo, de puerto o de modalidad SÍ vuelve al servidor: eso
 *     cambia la regla arancelaria, la tarifa de flete y los costos de destino,
 *     y esos son datos, no aritmética.
 *
 * La primera velocidad es la razón de la Regla de Dependencia: si el dominio
 * importara Prisma, no habría forma de que el motor corriera en el cliente.
 */

export interface PickablePort {
  id: string;
  unlocode: string;
  name: string;
  countryCode: string;
  isOrigin: boolean;
  isDestination: boolean;
}

export interface SimulatorLabels {
  params: string;
  sections: Record<string, string>;
  usingDefaults: string;
  modifiedCount: string;
  blocks: Record<string, string>;
  stageLabels: Record<string, string>;
  stageNotes: Record<string, string>;
  landedCostLabel: string;
  breakdownTitle: string;
  waterfallTitle: string;
  totalLabel: string;
  fields: Record<string, string>;
  modified: string;
  reset: string;
  containerSplit: string;
  columns: { index: string; vehicle: string; share: string; allocated: string };
  residueLabel: string;
  residueNote: string;
  timelineTitle: string;
  timelineTotal: string;
  phases: Record<string, string>;
  actions: { pdf: string; save: string; email: string };
  notQuotable: string;
  ceiling: string;
  prorationMethods: Record<string, string>;
  regions: Record<string, string>;
  modes: Record<string, string>;
  noRateForMode: string;
  noStockForRegion: string;
  emailing: string;
  emailed: string;
  picker: { change: string; search: string; empty: string; close: string };
  unitsSummary: string;
  fromCountry: string;
  recalculating: string;
  saving: string;
  saved: string;
  saveFailed: string;
  parametersChanged: string;
}

const BLOCK_ORDER: readonly CostBlock[] = [
  "ORIGIN",
  "FREIGHT",
  "TAX",
  "DESTINATION",
  "ADDON",
  "COMMERCIAL",
];

const UNIT_CHOICES = [1, 2, 3, 4] as const;
const PERCENT = 100;
/** Modalidades ofrecidas, en el orden del panel. El resto del enum no se cotiza aún. */
const OFFERED_MODES = ["CONTAINER_40HC", "RORO"] as const;

export function SimulatorClient({
  initialInput,
  initialModes,
  parameterSet,
  vehicles,
  ports,
  locale,
  labels,
}: {
  initialInput: LiquidationInput;
  initialModes: readonly string[];
  /** Con qué conjunto calculó el servidor. Viaja de vuelta al guardar. */
  parameterSet: { id: string; version: number };
  vehicles: readonly (PickableVehicle & { originPortId: string | null })[];
  ports: readonly PickablePort[];
  locale: string;
  labels: SimulatorLabels;
}) {
  const initialVehicle = vehicles[0];

  /** Lo que dijo el servidor. Es la referencia contra la que se marca "modificado". */
  const [baseline, setBaseline] = useState<LiquidationInput>(initialInput);
  /** Lo mismo, con los ajustes locales del usuario encima. */
  const [input, setInput] = useState<LiquidationInput>(initialInput);
  const [modes, setModes] = useState<readonly string[]>(initialModes);
  const [vehicleId, setVehicleId] = useState(initialVehicle?.id ?? "");
  const [portId, setPortId] = useState(
    ports.find((port) => port.isDestination)?.id ?? "",
  );
  const [mode, setMode] = useState<string>(initialModes[0] ?? OFFERED_MODES[0]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "saved"; id: string; reference: string; bornStale: boolean }
    | { kind: "emailing" }
    | { kind: "emailed"; to: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const intl = locale === "es" ? "es-CO" : "en-US";

  const regionNames = useMemo(
    () => new Intl.DisplayNames([intl], { type: "region" }),
    [intl],
  );
  /** Nombre de país desde el propio ICU: no hay tabla de países que mantener. */
  const countryName = useMemo(
    () => (code: string) => {
      try {
        return regionNames.of(code) ?? code;
      } catch {
        return code;
      }
    },
    [regionNames],
  );

  // El cálculo completo, en el cliente, en cada render. Es una función pura:
  // sin efectos, sin await, sin sorpresas.
  const result = useMemo(() => {
    try {
      return { ok: true as const, value: liquidate(input) };
    } catch (error) {
      return { ok: false as const, message: (error as Error).message };
    }
  }, [input]);

  const cop = (value: number) =>
    `COP ${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(value)}`;
  const usd = (value: number) =>
    `US$ ${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(value)}`;
  const usdExact = (value: number) =>
    `US$ ${new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  const compact = (value: number) =>
    new Intl.NumberFormat(intl, { notation: "compact", maximumFractionDigits: 1 }).format(value);
  const pct = (value: number) =>
    new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: 1 }).format(value);

  const patch = (mutate: (draft: LiquidationInput) => void) =>
    setInput((current) => {
      const next = structuredClone(current);
      mutate(next);
      return next;
    });

  /** Vuelve al servidor: el vehículo, el puerto o la modalidad cambian los DATOS. */
  const reassemble = (next: { vehicleId?: string; portId?: string; mode?: string }) => {
    const request = {
      vehicleId: next.vehicleId ?? vehicleId,
      destinationPortId: next.portId ?? portId,
      mode: next.mode ?? mode,
      unitsInContainer: input.consolidation.units.length,
      commercialMethod: input.consolidation.commercialMethod,
      taxableBaseMethod: input.consolidation.taxableBaseMethod,
      addOnCodes: [] as string[],
      importerIsEndConsumer: input.switches.importerIsEndConsumer,
      hasOriginCertificate: input.vehicle.hasOriginCertificate,
    };

    if (next.vehicleId !== undefined) setVehicleId(next.vehicleId);
    if (next.portId !== undefined) setPortId(next.portId);
    if (next.mode !== undefined) setMode(next.mode);

    startTransition(async () => {
      const response = await resimulate(request);
      if (!response.ok) {
        setServerError(response.message);
        return;
      }
      setServerError(null);
      setModes(response.modes);
      // La nueva entrada es la nueva referencia: los ajustes locales del
      // vehículo anterior no tienen sentido sobre otro vehículo u otra ruta.
      setBaseline(response.input);
      setInput(response.input);
    });
  };

  const isModified = (read: (i: LiquidationInput) => number) =>
    read(input) !== read(baseline);

  const countModified = (readers: readonly ((i: LiquidationInput) => number)[]) =>
    readers.filter((read) => isModified(read)).length;

  const units = input.consolidation.units.length;

  const setUnits = (count: number) =>
    patch((draft) => {
      const first = draft.consolidation.units[0];
      if (!first) return;
      draft.consolidation.units = Array.from({ length: count }, (_, index) => ({
        ...first,
        reference: index === 0 ? first.reference : `${first.reference} (${index + 1})`,
      }));
    });

  const numberField = (
    label: string,
    read: (i: LiquidationInput) => number,
    write: (draft: LiquidationInput, next: number) => void,
    step = 1,
  ) => {
    const modified = isModified(read);
    return (
      <label className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-text-muted">
          {label}
          {modified && (
            <>
              <span className="rounded-full bg-warning/15 px-1.5 text-[0.625rem] text-warning">
                {labels.modified}
              </span>
              <button
                type="button"
                onClick={() => patch((draft) => write(draft, read(baseline)))}
                className="inline-flex items-center gap-0.5 text-[0.625rem] text-primary hover:underline"
              >
                <RotateCcw size={9} aria-hidden />
                {labels.reset}
              </button>
            </>
          )}
        </span>
        <span
          className={clsx(
            "flex items-center rounded-control border bg-bg",
            // Barra ámbar: se ve de un vistazo dónde se salió del estándar.
            modified ? "border-l-[3px] border-border border-l-warning" : "border-border",
          )}
        >
          <input
            type="number"
            step={step}
            value={read(input)}
            onChange={(event) =>
              patch((draft) => write(draft, Number(event.target.value) || 0))
            }
            className="w-full min-w-0 bg-transparent px-2.5 py-1.5 text-[0.8125rem] text-text-primary"
            data-numeric
          />
        </span>
      </label>
    );
  };

  // ── Opciones derivadas de los datos, no escritas a mano ───────────────────

  const originPorts = ports.filter((port) => port.isOrigin);

  const vehiclePortCountry = (vehicle: { originPortId: string | null }) =>
    ports.find((port) => port.id === vehicle.originPortId)?.countryCode ?? null;


  /**
   * Un chip de origen se ofrece si hay PUERTO, pero solo se puede pulsar si hay
   * UNIDADES que embarquen desde allí. La distinción importa: Dubái y Canadá
   * son puertos cargados sin inventario, y un chip que se ve igual que los demás
   * pero no reacciona al pulsarlo se lee como una pantalla rota. Se muestra
   * apagado con su motivo, igual que las modalidades sin tarifa.
   */
  const regionChoices: Choice[] = SOURCING_REGIONS.filter((region) =>
    originPorts.some((port) => region.countryCodes.includes(port.countryCode)),
  ).map((region) => {
    const hasStock = vehicles.some((vehicle) => {
      const code = vehiclePortCountry(vehicle);
      return code !== null && region.countryCodes.includes(code);
    });
    return {
      value: region.key,
      label: labels.regions[region.key] ?? region.key,
      prefix: <Flag code={region.flagCode} className="rounded-[2px]" />,
      disabled: !hasStock,
      disabledReason: labels.noStockForRegion,
    };
  });

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const selectedRegion =
    SOURCING_REGIONS.find((region) => {
      const code = selectedVehicle ? vehiclePortCountry(selectedVehicle) : null;
      return code !== null && region.countryCodes.includes(code);
    })?.key ?? "";

  /** Al elegir una región se salta al primer vehículo que embarca desde allí. */
  const selectRegion = (regionKey: string) => {
    const region = SOURCING_REGIONS.find((candidate) => candidate.key === regionKey);
    if (!region) return;
    const match = vehicles.find((vehicle) => {
      const code = vehiclePortCountry(vehicle);
      return code !== null && region.countryCodes.includes(code);
    });
    if (match && match.id !== vehicleId) reassemble({ vehicleId: match.id });
  };

  const modeChoices: Choice[] = OFFERED_MODES.map((value) => ({
    value,
    label: labels.modes[value] ?? value,
    disabled: !modes.includes(value),
    disabledReason: labels.noRateForMode,
  }));

  const destinationPorts = ports.filter((port) => port.isDestination);

  // ── Estados de error ──────────────────────────────────────────────────────

  if (!result.ok || serverError) {
    return (
      <section className="rounded-card border border-danger/40 bg-surface p-8">
        <p className="text-sm text-danger">{labels.notQuotable}</p>
        <p className="mt-2 text-xs text-text-muted">
          {serverError ?? (result.ok ? "" : result.message)}
        </p>
      </section>
    );
  }

  const value = result.value;

  const groups: BreakdownGroup[] = BLOCK_ORDER.map((block) => {
    const items = value.lineItems.filter((l) => l.block === block && !l.isSubtotal);
    return {
      block,
      label: labels.blocks[block] ?? block,
      totalCop: items.reduce((sum, item) => sum + item.amountCop.toNumber(), 0),
      items,
    };
  }).filter((group) => group.items.length > 0);

  const waterfall = buildWaterfall(value.lineItems, labels.blocks, labels.totalLabel);

  const phases: Phase[] = TIMELINE_PHASES.map((phase) => ({
    key: phase.field,
    label: labels.phases[phase.messageKey] ?? phase.messageKey,
    days: value.timeline[phase.field],
  }));

  const totalUsd = value.totalCop.toNumber() / input.fx.trmCommercial;
  const originLabel = countryName(input.vehicle.originCountry);

  const nationalizationModified = countModified([
    (i) => i.switches.portDays,
    (i) => (i.switches.importerIsEndConsumer ? 1 : 0),
    (i) => (i.vehicle.hasOriginCertificate ? 1 : 0),
  ]);
  const commercialModified = countModified([(i) => i.commercial.marginRate]);

  const summaryFor = (count: number) =>
    count === 0
      ? labels.usingDefaults
      : labels.modifiedCount.replace("{count}", String(count));

  const pdfUrl = (quoteId: string) => `/api/cotizaciones/${quoteId}/pdf?locale=${locale}`;

  /**
   * Descarga la propuesta.
   *
   * El PDF se dibuja desde la INSTANTÁNEA de una cotización emitida, así que
   * primero hay que emitirla. No es un rodeo: una propuesta que se envía a un
   * cliente y no quedó registrada es un precio que nadie puede reproducir
   * después.
   */
  const handlePdf = () => {
    if (saveState.kind === "saved") {
      window.open(pdfUrl(saveState.id), "_blank", "noopener");
      return;
    }
    handleSave((quoteId) => {
      window.open(pdfUrl(quoteId), "_blank", "noopener");
    });
  };

  /** Envía la propuesta. Emite la cotización primero si hace falta. */
  const handleEmail = () => {
    setSaveState({ kind: "emailing" });
    startTransition(async () => {
      const response = await emailQuoteAction(quoteRequest());
      setSaveState(
        response.ok
          ? { kind: "emailed", to: response.to }
          : { kind: "error", message: response.message },
      );
    });
  };

  /**
   * Emite la cotización.
   *
   * Los ajustes locales viajan como `overrides`. Sin ellos el servidor
   * rearmaría la entrada desde la base —con el precio de catálogo, no con el que
   * el usuario tecleó— y su total no coincidiría con el de la pantalla: el
   * guardado se rechazaría a sí mismo con PARAMETERS_CHANGED sin que ningún
   * parámetro hubiese cambiado.
   */
  const quoteRequest = () => ({
    simulation: {
          vehicleId,
          destinationPortId: portId,
          mode,
          unitsInContainer: units,
          commercialMethod: input.consolidation.commercialMethod,
          taxableBaseMethod: input.consolidation.taxableBaseMethod,
          addOnCodes: [],
          importerIsEndConsumer: input.switches.importerIsEndConsumer,
          hasOriginCertificate: input.vehicle.hasOriginCertificate,
          overrides: {
            purchasePriceUsd: input.origin.purchasePriceUsd,
            auctionFeeUsd: input.origin.auctionFeeUsd,
            buyerFeeUsd: input.origin.buyerFeeUsd,
            inlandFreightUsd: input.origin.inlandFreightUsd,
            exportDocsUsd: input.origin.exportDocsUsd,
            containerCostUsd: input.freight.containerCostUsd,
            surchargesUsd: input.freight.surchargesUsd,
            insuranceRate: input.freight.insuranceRate,
            portDays: input.switches.portDays,
            marginRate: input.commercial.marginRate,
          },
        },
    parameterSetId: parameterSet.id,
    parameterSetVersion: parameterSet.version,
    expectedTotalCopMinor: value.totalCop.toJSON().minor,
    locale,
  });

  const handleSave = (then?: (quoteId: string) => void) => {
    setSaveState({ kind: "saving" });
    startTransition(async () => {
      const response = await saveQuoteAction(quoteRequest());

      if (response.ok) {
        setSaveState({
          kind: "saved",
          id: response.quote.id,
          reference: response.quote.reference,
          bornStale: response.bornStale,
        });
        then?.(response.quote.id);
        return;
      }

      setSaveState({
        kind: "error",
        message:
          response.reason === "PARAMETERS_CHANGED"
            ? labels.parametersChanged
            : response.message,
      });
    });
  };

  return (
    /* En escritorio la pantalla NO hace scroll: ocupa el alto de la ventana y
       cada panel se desplaza por dentro. Es lo que pide el diseño —una sola
       vista— y de paso mantiene la cifra final a la vista mientras se mueven
       los parámetros, que es el momento que vende el producto. */
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
        {/* ── Parámetros ───────────────────────────────────────────────── */}
        <section
          className={clsx(
            "col-span-12 flex min-h-0 flex-col rounded-card border border-border bg-surface lg:col-span-5",
            pending && "opacity-60 transition-opacity",
          )}
          aria-busy={pending}
        >
          <div className="flex shrink-0 items-baseline justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-[0.6875rem] font-semibold tracking-[0.14em] text-text-muted uppercase">
              {labels.params}
            </h2>
            {pending && (
              <span className="text-[0.6875rem] text-primary">{labels.recalculating}</span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {/* 1 · Vehículo */}
            <CollapsibleSection title={labels.sections.vehicle ?? ""}>
              <VehiclePicker
                vehicles={vehicles}
                selectedId={vehicleId}
                onSelect={(id) => reassemble({ vehicleId: id })}
                disabled={pending}
                labels={labels.picker}
                countryName={countryName}
              />
            </CollapsibleSection>

            {/* 2 · Origen */}
            <CollapsibleSection title={labels.sections.origin ?? ""}>
              <Field label={labels.fields.originCountry ?? ""}>
                <ChoiceChips
                  choices={regionChoices}
                  value={selectedRegion}
                  onChange={selectRegion}
                  ariaLabel={labels.fields.originCountry ?? ""}
                  size="sm"
                />
              </Field>

              <label className="flex flex-col gap-1">
                <FieldLabel>{labels.fields.entryPort}</FieldLabel>
                <select
                  value={portId}
                  onChange={(event) => reassemble({ portId: event.target.value })}
                  disabled={pending}
                  className={CONTROL}
                >
                  {destinationPorts.map((port) => (
                    <option key={port.id} value={port.id}>
                      {port.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {numberField(
                  labels.fields.purchasePrice ?? "",
                  (i) => i.origin.purchasePriceUsd,
                  (d, n) => {
                    d.origin.purchasePriceUsd = n;
                  },
                  100,
                )}
                {numberField(
                  labels.fields.auctionFee ?? "",
                  (i) => i.origin.auctionFeeUsd,
                  (d, n) => {
                    d.origin.auctionFeeUsd = n;
                  },
                  10,
                )}
                {numberField(
                  labels.fields.inlandFreight ?? "",
                  (i) => i.origin.inlandFreightUsd,
                  (d, n) => {
                    d.origin.inlandFreightUsd = n;
                  },
                  10,
                )}
                {numberField(
                  labels.fields.exportDocs ?? "",
                  (i) => i.origin.exportDocsUsd,
                  (d, n) => {
                    d.origin.exportDocsUsd = n;
                  },
                  10,
                )}
              </div>
            </CollapsibleSection>

            {/* 3 · Flete y seguro */}
            <CollapsibleSection title={labels.sections.freight ?? ""}>
              <Field label={labels.fields.transportMode ?? ""}>
                <ChoiceChips
                  choices={modeChoices}
                  value={mode}
                  onChange={(next) => reassemble({ mode: next })}
                  ariaLabel={labels.fields.transportMode ?? ""}
                  size="sm"
                />
              </Field>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {numberField(
                  labels.fields.containerCost ?? "",
                  (i) => i.freight.containerCostUsd,
                  (d, n) => {
                    d.freight.containerCostUsd = n;
                  },
                  100,
                )}
                {numberField(
                  labels.fields.surcharges ?? "",
                  (i) => i.freight.surchargesUsd,
                  (d, n) => {
                    d.freight.surchargesUsd = n;
                  },
                  10,
                )}
              </div>

              {numberField(
                labels.fields.insuranceRate ?? "",
                (i) => i.freight.insuranceRate * PERCENT,
                (d, n) => {
                  d.freight.insuranceRate = n / PERCENT;
                },
                0.1,
              )}
            </CollapsibleSection>

            {/* 4 · Consolidación */}
            <CollapsibleSection title={labels.sections.consolidation ?? ""}>
              <Field label={labels.fields.unitsPerContainer ?? ""}>
                <div className="flex gap-1.5">
                  {UNIT_CHOICES.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setUnits(count)}
                      aria-pressed={units === count}
                      className={clsx(
                        "h-8 w-9 rounded-control border text-[0.8125rem] transition-colors",
                        units === count
                          ? "border-primary bg-primary/12 font-medium text-text-primary"
                          : "border-border text-text-secondary hover:border-border-strong",
                      )}
                      data-numeric
                    >
                      {count === UNIT_CHOICES[UNIT_CHOICES.length - 1] ? `${count}+` : count}
                    </button>
                  ))}
                </div>
              </Field>

              <label className="flex flex-col gap-1">
                <FieldLabel>{labels.fields.prorationMethod}</FieldLabel>
                <select
                  value={input.consolidation.commercialMethod}
                  onChange={(event) =>
                    patch((draft) => {
                      draft.consolidation.commercialMethod = event.target
                        .value as LiquidationInput["consolidation"]["commercialMethod"];
                    })
                  }
                  className={CONTROL}
                >
                  {Object.entries(labels.prorationMethods).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </CollapsibleSection>

            {/* 5 · Nacionalización — cerrada, con valores estándar */}
            <CollapsibleSection
              title={labels.sections.nationalization ?? ""}
              summary={summaryFor(nationalizationModified)}
              defaultOpen={false}
            >
              {numberField(
                labels.fields.portDays ?? "",
                (i) => i.switches.portDays,
                (d, n) => {
                  d.switches.portDays = n;
                },
              )}

              <Switch
                checked={input.switches.importerIsEndConsumer}
                onChange={(next) =>
                  patch((draft) => {
                    draft.switches.importerIsEndConsumer = next;
                  })
                }
                label={labels.fields.importerIsEndConsumer ?? ""}
                hint={labels.fields.importerHint ?? ""}
              />

              <Switch
                checked={input.vehicle.hasOriginCertificate}
                onChange={(next) =>
                  patch((draft) => {
                    draft.vehicle.hasOriginCertificate = next;
                  })
                }
                label={labels.fields.hasOriginCertificate ?? ""}
                hint={labels.fields.certificateHint ?? ""}
              />
            </CollapsibleSection>

            {/* 6 · Comercial — cerrada, con valores estándar */}
            <CollapsibleSection
              title={labels.sections.commercial ?? ""}
              summary={summaryFor(commercialModified)}
              defaultOpen={false}
            >
              {numberField(
                labels.fields.marginRate ?? "",
                (i) => i.commercial.marginRate * PERCENT,
                (d, n) => {
                  d.commercial.marginRate = n / PERCENT;
                },
                0.5,
              )}
            </CollapsibleSection>
          </div>
        </section>

        {/* ── Resultados ───────────────────────────────────────────────── */}
        <section className="col-span-12 flex min-h-0 flex-col rounded-card border border-border bg-surface-elevated lg:col-span-7">
          {/* Banda de la cifra: fija, nunca se desplaza. Es el ancla de la
              pantalla — el número tiene que estar a la vista mientras se
              mueven los parámetros. */}
          <div className="shrink-0 border-b border-border px-5 pt-4 pb-3.5">
            <p className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
              {labels.landedCostLabel}
            </p>
            <p
              className="mt-1 font-display text-[3rem] leading-[1.05] font-semibold tracking-[-0.02em] text-accent"
              data-numeric
            >
              {cop(value.totalCop.toNumber())}
            </p>
            <p className="mt-1.5 text-[0.8125rem] text-text-secondary">
              ≈ {usd(totalUsd)} ·{" "}
              {labels.unitsSummary.replace("{count}", String(units))} ·{" "}
              {labels.fromCountry.replace("{country}", originLabel)}
            </p>

            {value.status !== "VALOR" && value.totalCopCeiling && (
              <p className="mt-2 inline-flex rounded-control bg-warning/12 px-2 py-0.5 text-[0.6875rem] text-warning">
                {labels.ceiling.replace("{amount}", cop(value.totalCopCeiling.toNumber()))}
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <SectionLabel>{labels.waterfallTitle}</SectionLabel>
              <CostWaterfall blocks={waterfall} formatCompact={compact} />
            </div>

            <div>
              <SectionLabel>{labels.breakdownTitle}</SectionLabel>
              <BreakdownAccordion
                groups={groups}
                formatCop={cop}
                labelFor={(item: LineItem) => labels.stageLabels[item.code] ?? item.code}
                noteFor={(item: LineItem) =>
                  labels.stageNotes[item.code] ?? item.legalBasis ?? null
                }
              />
            </div>

            {phases.length > 0 && (
              <div>
                <SectionLabel>{labels.timelineTitle}</SectionLabel>
                <TimelineStrip
                  phases={phases}
                  totalLabel={labels.timelineTotal.replace(
                    "{days}",
                    String(value.timeline.totalDays),
                  )}
                  dayLabel={(days) => `${days} d`}
                />
              </div>
            )}
          </div>

          {/* Barra de acciones al pie del panel derecho. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-5 py-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePdf}
              disabled={pending || saveState.kind === "saving"}
            >
              {labels.actions.pdf}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave()}
              disabled={pending || saveState.kind === "saving"}
            >
              {saveState.kind === "saving" ? labels.saving : labels.actions.save}
            </Button>
            <Button
              size="sm"
              onClick={handleEmail}
              disabled={pending || saveState.kind === "emailing"}
            >
              {saveState.kind === "emailing" ? labels.emailing : labels.actions.email}
            </Button>

            {saveState.kind === "saved" && (
              <a
                href={pdfUrl(saveState.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.6875rem] text-accent hover:underline"
                data-numeric
              >
                {labels.saved.replace("{reference}", saveState.reference)}
              </a>
            )}
            {saveState.kind === "emailed" && (
              <span className="text-[0.6875rem] text-success">
                {labels.emailed.replace("{to}", saveState.to)}
              </span>
            )}
            {saveState.kind === "error" && (
              <span className="text-[0.6875rem] text-danger">
                {labels.saveFailed.replace("{message}", saveState.message)}
              </span>
            )}
          </div>
        </section>
      </div>

      {/* ── Reparto del contenedor, a todo el ancho bajo los dos paneles ─── */}
      <section className="shrink-0 rounded-card border border-border bg-surface">
        <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-[0.6875rem] font-semibold tracking-[0.14em] text-text-muted uppercase">
            {labels.containerSplit.replace("{count}", String(units))}
          </h2>
          <p className="hidden text-[0.6875rem] text-text-muted sm:block">
            {labels.residueNote}
          </p>
        </div>
        <div className="max-h-[9.5rem] overflow-y-auto">
          <ProrationTable
            proration={value.freightProration}
            columns={labels.columns}
            residueLabel={labels.residueLabel}
            totalLabel={labels.totalLabel}
            formatUsd={usdExact}
            formatPercent={pct}
          />
        </div>
      </section>
    </div>
  );
}

/* ── Piezas de presentación locales ───────────────────────────────────────
 * Viven aquí y no en `components/ui` porque solo describen el ritmo de ESTE
 * panel. Subirlas al sistema de diseño antes de que un segundo panel las pida
 * sería inventar una abstracción sin segundo caso.
 */

const CONTROL =
  "rounded-control border border-border bg-bg px-2.5 py-1.5 text-[0.8125rem] text-text-secondary";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[0.6875rem] text-text-muted">{children}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[0.6875rem] font-semibold tracking-[0.14em] text-text-muted uppercase">
      {children}
    </h3>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-3.5 shrink-0 accent-[var(--primary)]"
      />
      <span className="text-xs text-text-secondary">
        {label}
        <span className="mt-0.5 block text-[0.6875rem] text-text-muted">{hint}</span>
      </span>
    </label>
  );
}
