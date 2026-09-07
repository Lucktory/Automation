"use client";

import clsx from "clsx";
import type { CostBlock, LineItem } from "@/modules/pricing";

/**
 * Cascada de costos.
 *
 * Cada barra flota sobre el acumulado anterior, así que la altura no es el
 * total sino el aporte de ese bloque. Es la única forma de que "los tributos
 * son casi la mitad" se vea en vez de leerse.
 *
 * Los TRIBUTOS van en ámbar a propósito: es la cifra a la que más reacciona
 * quien lee la propuesta, y merece encontrarse sola. El total va en acento.
 */

export interface WaterfallBlock {
  block: CostBlock | "TOTAL";
  label: string;
  amountCop: number;
  /** Acumulado antes de este bloque, para el desplazamiento vertical. */
  startCop: number;
  sharePct: number;
}

const BLOCK_ORDER: readonly CostBlock[] = [
  "ORIGIN",
  "FREIGHT",
  "TAX",
  "DESTINATION",
  "ADDON",
  "COMMERCIAL",
];

export function buildWaterfall(
  lineItems: readonly LineItem[],
  labels: Record<string, string>,
  totalLabel: string,
): WaterfallBlock[] {
  const totals = new Map<CostBlock, number>();
  for (const item of lineItems) {
    // Los subtotales (FOB, CIF) no son costos: sumarlos contaría dos veces.
    if (item.isSubtotal) continue;
    totals.set(item.block, (totals.get(item.block) ?? 0) + item.amountCop.toNumber());
  }

  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  let running = 0;

  const blocks: WaterfallBlock[] = BLOCK_ORDER.filter(
    (block) => (totals.get(block) ?? 0) !== 0,
  ).map((block) => {
    const amountCop = totals.get(block) ?? 0;
    const entry: WaterfallBlock = {
      block,
      label: labels[block] ?? block,
      amountCop,
      startCop: running,
      sharePct: grand === 0 ? 0 : (amountCop / grand) * 100,
    };
    running += amountCop;
    return entry;
  });

  blocks.push({
    block: "TOTAL",
    label: totalLabel,
    amountCop: grand,
    startCop: 0,
    sharePct: 100,
  });

  return blocks;
}

const CHART_HEIGHT_REM = 6.5;
/** Alto mínimo de barra: un bloque de 0,3 % debe seguir viéndose. */
const MIN_BAR_PCT = 2;

export function CostWaterfall({
  blocks,
  formatCompact,
}: {
  blocks: readonly WaterfallBlock[];
  formatCompact: (value: number) => string;
}) {
  const grand = blocks.find((b) => b.block === "TOTAL")?.amountCop ?? 0;
  if (grand === 0) return null;

  return (
    <div className="overflow-x-auto">
      <div
        className="flex min-w-[26rem] gap-1.5 border-b border-border"
        style={{ height: `${CHART_HEIGHT_REM}rem` }}
        role="img"
        aria-label={blocks.map((b) => `${b.label}: ${formatCompact(b.amountCop)}`).join(", ")}
      >
        {blocks.map((entry, index) => {
          const heightPct = Math.max(MIN_BAR_PCT, (entry.amountCop / grand) * 100);
          const bottomPct = (entry.startCop / grand) * 100;
          const isTotal = entry.block === "TOTAL";
          const isTax = entry.block === "TAX";
          // El conector arranca donde termina esta barra y llega a la base de
          // la siguiente: es lo que convierte seis barras sueltas en una
          // cascada, porque enseña que cada bloque parte del acumulado previo.
          const hasConnector = !isTotal && index < blocks.length - 2;

          return (
            /* `h-full` es obligatorio: los hijos van en posición absoluta, así
               que sin altura propia la columna mide cero y las barras —cuya
               altura es un porcentaje de ella— se vuelven invisibles. */
            <div key={entry.block} className="relative h-full flex-1">
              <span
                className="absolute left-1/2 -translate-x-1/2 text-[0.625rem] whitespace-nowrap text-text-secondary"
                style={{ bottom: `calc(${bottomPct + heightPct}% + 0.3rem)` }}
                data-numeric
              >
                {formatCompact(entry.amountCop)}
              </span>
              <div
                className={clsx(
                  "absolute inset-x-0 rounded-[2px]",
                  isTotal ? "bg-accent" : isTax ? "bg-warning" : "bg-text-muted/70",
                )}
                style={{ height: `${heightPct}%`, bottom: `${bottomPct}%` }}
              />
              {hasConnector && (
                <span
                  aria-hidden
                  className="absolute -right-1.5 w-1.5 border-t border-dashed border-border-strong"
                  style={{ bottom: `${bottomPct + heightPct}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex min-w-[26rem] gap-1.5">
        {blocks.map((entry) => (
          <div key={entry.block} className="flex-1 text-center">
            <p className="truncate text-[0.625rem] text-text-secondary">{entry.label}</p>
            <p className="text-[0.625rem] text-text-muted" data-numeric>
              {Math.round(entry.sharePct)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
