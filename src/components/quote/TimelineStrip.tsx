import {
  Anchor,
  FileCheck,
  Landmark,
  ShoppingCart,
  Ship,
  Truck,
} from "lucide-react";

/**
 * Franja de tiempos.
 *
 * Seis fases con sus días. Los valores vienen de los parámetros, no del código:
 * el tiempo de tránsito lo fija la tarifa de flete de la ruta y el resto son
 * reglas de destino.
 */

const ICONS = [ShoppingCart, Truck, Ship, Anchor, FileCheck, Landmark] as const;

export interface Phase {
  key: string;
  label: string;
  days: number;
}

export function TimelineStrip({
  phases,
  totalLabel,
  dayLabel,
}: {
  phases: readonly Phase[];
  totalLabel: string;
  dayLabel: (days: number) => string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <ol className="flex min-w-0 flex-1 flex-wrap items-start gap-x-1.5 gap-y-3">
        {phases.map((phase, index) => {
          const Icon = ICONS[index % ICONS.length] ?? ShoppingCart;
          const isLast = index === phases.length - 1;

          return (
            <li key={phase.key} className="flex min-w-[4.5rem] flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <span className="grid size-7 place-items-center rounded-full border border-border-strong text-text-secondary">
                  <Icon size={12} aria-hidden />
                </span>
                <span className="mt-1.5 text-[0.6875rem] text-text-secondary">{phase.label}</span>
                <span className="text-[0.6875rem] text-text-muted" data-numeric>
                  {dayLabel(phase.days)}
                </span>
              </div>
              {!isLast && (
                <span aria-hidden className="mt-3.5 h-px w-full flex-1 bg-border" />
              )}
            </li>
          );
        })}
      </ol>

      <span className="shrink-0 rounded-control border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem] text-text-primary">
        {totalLabel}
      </span>
    </div>
  );
}
