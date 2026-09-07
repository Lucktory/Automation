"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";

/**
 * Reserva.
 *
 * Los servicios adicionales SUMAN de verdad: marcar el wallbox cambia el total
 * y el saldo en la misma pulsación. Es el módulo de venta cruzada del encargo, y
 * una casilla que no mueve la cifra no lo demuestra — lo simula.
 *
 * El depósito no se recalcula con los extras a propósito: reserva la unidad, no
 * los accesorios, que se cobran contra entrega. Es una regla de negocio, no un
 * descuido.
 */

export interface CheckoutAddOn {
  code: string;
  label: string;
  priceCop: number;
  category: string;
}

export function CheckoutClient({
  vehicleLabel,
  baseTotalCop,
  depositCop,
  addOns,
  locale,
  labels,
}: {
  vehicleLabel: string;
  baseTotalCop: number;
  depositCop: number;
  addOns: readonly CheckoutAddOn[];
  locale: string;
  labels: {
    summary: string;
    addOnsTitle: string;
    landedLabel: string;
    addOnsTotal: string;
    total: string;
    depositLabel: string;
    balanceLabel: string;
    payDeposit: string;
    secureNote: string;
    reserved: string;
    reservedNote: string;
  };
}) {
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [reserved, setReserved] = useState(false);

  const cop = useMemo(() => {
    const formatter = new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
      maximumFractionDigits: 0,
    });
    return (value: number) => `COP ${formatter.format(value)}`;
  }, [locale]);

  const addOnsTotal = addOns
    .filter((addOn) => selected.includes(addOn.code))
    .reduce((sum, addOn) => sum + addOn.priceCop, 0);

  const total = baseTotalCop + addOnsTotal;
  const balance = Math.max(0, total - depositCop);

  const toggle = (code: string) =>
    setSelected((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="lg:col-span-7">
        <h2 className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
          {labels.addOnsTitle}
        </h2>

        <ul className="mt-3 flex flex-col gap-2">
          {addOns.map((addOn) => {
            const isOn = selected.includes(addOn.code);
            return (
              <li key={addOn.code}>
                <label
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded-card border px-4 py-3 transition-colors",
                    isOn
                      ? "border-primary bg-primary/8"
                      : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggle(addOn.code)}
                    className="size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 text-sm text-text-primary">
                    {addOn.label}
                  </span>
                  <span
                    className={clsx(
                      "shrink-0 text-sm",
                      isOn ? "text-accent" : "text-text-secondary",
                    )}
                    data-numeric
                  >
                    + {cop(addOn.priceCop)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="lg:col-span-5">
        <div className="rounded-card border border-border bg-surface-elevated p-5 lg:sticky lg:top-20">
          <h2 className="text-[0.6875rem] tracking-[0.14em] text-text-muted uppercase">
            {labels.summary}
          </h2>
          <p className="mt-2 text-sm text-text-primary">{vehicleLabel}</p>

          <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <Row label={labels.landedLabel} value={cop(baseTotalCop)} />
            {addOnsTotal > 0 && (
              <Row
                label={labels.addOnsTotal}
                value={`+ ${cop(addOnsTotal)}`}
                tone="accent"
              />
            )}
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
              <dt className="text-sm font-medium text-text-primary">{labels.total}</dt>
              <dd
                className="font-display text-xl font-semibold text-accent"
                data-numeric
              >
                {cop(total)}
              </dd>
            </div>
            <Row label={labels.depositLabel} value={cop(depositCop)} />
            <Row label={labels.balanceLabel} value={cop(balance)} />
          </dl>

          {reserved ? (
            <div className="mt-5 flex items-start gap-2 rounded-control border border-success/40 bg-surface px-3 py-2.5">
              <CheckCircle2 size={16} aria-hidden className="mt-0.5 shrink-0 text-success" />
              <span className="text-xs text-text-secondary">
                <span className="block text-sm text-text-primary">{labels.reserved}</span>
                {labels.reservedNote}
              </span>
            </div>
          ) : (
            <Button
              variant="primary"
              className="mt-5 w-full"
              onClick={() => setReserved(true)}
            >
              {labels.payDeposit}
            </Button>
          )}

          <p className="mt-3 flex items-start gap-2 text-xs text-text-muted">
            <ShieldCheck size={13} aria-hidden className="mt-0.5 shrink-0" />
            {labels.secureNote}
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd
        className={clsx("text-sm", tone === "accent" ? "text-accent" : "text-text-primary")}
        data-numeric
      >
        {value}
      </dd>
    </div>
  );
}
