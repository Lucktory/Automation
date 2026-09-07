"use client";

import { ChevronRight, Info } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { CostBlock, LineItem } from "@/modules/pricing";

/**
 * Desglose detallado.
 *
 * Cada línea muestra SU PROPIA base legal, no una nota compartida: el arancel,
 * el IVA y el impoconsumo se calculan sobre bases distintas y decirlo en cada
 * fila es lo que evita el error más común del sector.
 *
 * Este acordeón se alimenta del mismo array de `LineItem` que imprime el PDF,
 * así que la pantalla y el documento no pueden divergir.
 */

export interface BreakdownGroup {
  block: CostBlock;
  label: string;
  totalCop: number;
  items: readonly LineItem[];
}

export function BreakdownAccordion({
  groups,
  formatCop,
  defaultOpen = "TAX",
  labelFor,
  noteFor,
}: {
  groups: readonly BreakdownGroup[];
  formatCop: (value: number) => string;
  defaultOpen?: CostBlock;
  labelFor: (item: LineItem) => string;
  noteFor: (item: LineItem) => string | null;
}) {
  const [open, setOpen] = useState<CostBlock | null>(defaultOpen);

  return (
    <ul className="divide-y divide-border">
      {groups.map((group) => {
        const isOpen = open === group.block;
        return (
          <li key={group.block}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : group.block)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2.5 py-2 text-left transition-colors hover:bg-surface/60"
            >
              <ChevronRight
                size={15}
                aria-hidden
                className={clsx(
                  "shrink-0 text-text-muted transition-transform",
                  isOpen && "rotate-90",
                )}
              />
              <span className="flex-1 text-[0.8125rem] text-text-primary">{group.label}</span>
              <span className="text-[0.8125rem] font-medium text-text-primary" data-numeric>
                {formatCop(group.totalCop)}
              </span>
            </button>

            {isOpen && (
              <ul className="pb-2">
                {group.items.map((item) => {
                  const note = noteFor(item);
                  return (
                    <li
                      key={item.code}
                      className="flex items-start gap-2.5 border-l border-border py-1.5 pr-1 pl-6"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.8125rem] text-text-secondary">
                          {labelFor(item)}
                        </span>
                        {note && (
                          <span className="mt-0.5 block text-[0.6875rem] text-text-muted">
                            {note}
                          </span>
                        )}
                        {item.warning && (
                          <span className="mt-0.5 block text-xs text-warning">
                            {item.warning}
                          </span>
                        )}
                      </span>
                      <span
                        className="shrink-0 text-[0.8125rem] text-text-secondary"
                        data-numeric
                      >
                        {formatCop(item.amountCop.toNumber())}
                      </span>
                      <Info size={13} aria-hidden className="mt-1 shrink-0 text-text-muted" />
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
