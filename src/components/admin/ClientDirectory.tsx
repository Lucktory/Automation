"use client";

import { useState } from "react";
import { MoreHorizontal, Mail, Phone, IdCard, X } from "lucide-react";
import clsx from "clsx";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/admin/Pill";
import { CLIENT_STAGE_TONE, type ClientStage } from "@/config/lead-display";

/**
 * Directorio de clientes: la tabla y la ficha lateral.
 *
 * Es cliente porque la ficha se abre al pulsar una fila y se cierra con Escape —
 * estado de interfaz puro. Todo lo demás (consultar, filtrar, buscar, ordenar)
 * sigue ocurriendo en el servidor: las filas llegan ya resueltas, incluida la
 * actividad reciente, así que abrir una ficha no dispara ninguna petición.
 *
 * La tabla es casi monocromática a propósito. Con nueve columnas de datos, el
 * color tiene que quedar reservado para las dos que se leen de un vistazo —el
 * origen y el estado—; si todo lleva color, no destaca nada.
 */

export interface ActivityEntry {
  id: string;
  text: string;
  date: string;
  tone: ClientStage | "neutral";
}

export interface ClientRow {
  id: string;
  name: string;
  initials: string;
  city: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  sourceLabel: string;
  sourceClassName: string;
  quotes: number;
  orders: number;
  /** Ya formateado: la vista no vuelve a tocar cifras. */
  value: string;
  /** El mismo dato en crudo. Quien suma la cartera necesita el número, no el texto. */
  valueCop: number;
  lastActivity: string;
  stage: ClientStage;
  stageLabel: string;
  activity: readonly ActivityEntry[];
}

export interface ClientDirectoryLabels {
  columns: {
    name: string;
    email: string;
    phone: string;
    document: string;
    source: string;
    quotes: string;
    orders: string;
    value: string;
    lastActivity: string;
    status: string;
  };
  rowMenu: string;
  viewDetail: string;
  sendEmail: string;
  newQuote: string;
  activity: string;
  noActivity: string;
  close: string;
  empty: string;
}

const EMPTY = "—";

/** Punto de la línea de tiempo. El color repite el del estado, no inventa otro. */
const DOT: Record<ActivityEntry["tone"], string> = {
  client: "bg-success",
  prospect: "bg-info",
  inactive: "bg-text-muted",
  neutral: "bg-border-strong",
};

export function ClientDirectory({
  rows,
  labels,
}: {
  rows: readonly ClientRow[];
  labels: ClientDirectoryLabels;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === openId) ?? null;

  if (rows.length === 0) {
    return (
      <p className="px-5 py-14 text-center text-sm text-text-muted">{labels.empty}</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {(
                [
                  ["name", "left"],
                  ["email", "left"],
                  ["phone", "left"],
                  ["document", "left"],
                  ["source", "left"],
                  ["quotes", "right"],
                  ["orders", "right"],
                  ["value", "right"],
                  ["lastActivity", "left"],
                  ["status", "left"],
                ] as const
              ).map(([key, align]) => (
                <th
                  key={key}
                  scope="col"
                  className={clsx(
                    "px-4 py-2.5 text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase whitespace-nowrap",
                    align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {labels.columns[key]}
                </th>
              ))}
              <th scope="col" className="w-10 px-2">
                <span className="sr-only">{labels.rowMenu}</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setOpenId(row.id)}
                className="h-14 cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface-elevated"
              >
                <td className="px-4">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-elevated text-[0.6875rem] font-medium text-text-secondary"
                    >
                      {row.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text-primary">
                        {row.name}
                      </span>
                      {row.city && (
                        <span className="block truncate text-[0.6875rem] text-text-muted">
                          {row.city}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="px-4 text-text-secondary">{row.email ?? EMPTY}</td>
                <td className="px-4 whitespace-nowrap text-text-secondary" data-numeric>
                  {row.phone ?? EMPTY}
                </td>
                <td className="px-4 whitespace-nowrap text-text-secondary" data-numeric>
                  {row.document ?? EMPTY}
                </td>
                <td className="px-4">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                      row.sourceClassName,
                    )}
                  >
                    {row.sourceLabel}
                  </span>
                </td>
                <td className="px-4 text-right text-text-secondary" data-numeric>
                  {row.quotes}
                </td>
                <td className="px-4 text-right text-text-secondary" data-numeric>
                  {row.orders}
                </td>
                <td
                  className={clsx(
                    "px-4 text-right whitespace-nowrap",
                    row.valueCop > 0 ? "font-medium text-text-primary" : "text-text-muted",
                  )}
                  data-numeric
                >
                  {row.value}
                </td>
                <td className="px-4 whitespace-nowrap text-text-muted">{row.lastActivity}</td>
                <td className="px-4">
                  <Pill tone={CLIENT_STAGE_TONE[row.stage]}>{row.stageLabel}</Pill>
                </td>
                <td className="px-2" onClick={(event) => event.stopPropagation()}>
                  <Menu
                    label={labels.rowMenu}
                    align="end"
                    trigger={({ open }) => (
                      <span
                        className={clsx(
                          "grid size-7 place-items-center rounded-control transition-colors",
                          open
                            ? "bg-surface-elevated text-text-primary"
                            : "text-text-muted hover:bg-surface-elevated hover:text-text-primary",
                        )}
                      >
                        <MoreHorizontal size={15} aria-hidden />
                      </span>
                    )}
                  >
                    {(close) => (
                      <>
                        <MenuItem
                          onSelect={() => {
                            setOpenId(row.id);
                            close();
                          }}
                        >
                          {labels.viewDetail}
                        </MenuItem>
                        <MenuItem onSelect={close}>{labels.newQuote}</MenuItem>
                        <MenuItem onSelect={close}>{labels.sendEmail}</MenuItem>
                      </>
                    )}
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <ClientPanel row={selected} labels={labels} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}

/**
 * Ficha lateral.
 *
 * Entra desde la derecha sobre un velo. El velo es un botón de verdad y Escape
 * cierra: una capa que sólo se cierra con su aspa deja atrapado a quien navega
 * con teclado.
 */
function ClientPanel({
  row,
  labels,
  onClose,
}: {
  row: ClientRow;
  labels: ClientDirectoryLabels;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={labels.close}
        onClick={onClose}
        className="absolute inset-0 bg-text-primary/25"
      />

      <aside
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        className="relative flex h-full w-full max-w-[26rem] flex-col overflow-y-auto border-l border-border bg-bg shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-elevated text-sm font-medium text-text-secondary"
            >
              {row.initials}
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-semibold text-text-primary">
                {row.name}
              </h2>
              {row.city && <p className="truncate text-xs text-text-muted">{row.city}</p>}
              <span className="mt-1.5 inline-block">
                <Pill tone={CLIENT_STAGE_TONE[row.stage]}>{row.stageLabel}</Pill>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            autoFocus
            className="-mr-1 rounded-control p-1.5 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            <X size={17} aria-hidden />
          </button>
        </div>

        <dl className="flex flex-col gap-2.5 px-6 pb-5 text-[0.8125rem]">
          {row.email && (
            <div className="flex items-center gap-2.5">
              <Mail size={14} aria-hidden className="shrink-0 text-text-muted" />
              <dd className="truncate text-text-secondary">{row.email}</dd>
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-2.5">
              <Phone size={14} aria-hidden className="shrink-0 text-text-muted" />
              <dd className="text-text-secondary" data-numeric>
                {row.phone}
              </dd>
            </div>
          )}
          {row.document && (
            <div className="flex items-center gap-2.5">
              <IdCard size={14} aria-hidden className="shrink-0 text-text-muted" />
              <dd className="text-text-secondary" data-numeric>
                {row.document}
              </dd>
            </div>
          )}
        </dl>

        <div className="grid grid-cols-3 gap-3 border-y border-border px-6 py-4">
          <div>
            <p className="font-display text-xl leading-none font-semibold text-text-primary" data-numeric>
              {row.quotes}
            </p>
            <p className="mt-1 text-[0.6875rem] text-text-muted">{labels.columns.quotes}</p>
          </div>
          <div>
            <p className="font-display text-xl leading-none font-semibold text-text-primary" data-numeric>
              {row.orders}
            </p>
            <p className="mt-1 text-[0.6875rem] text-text-muted">{labels.columns.orders}</p>
          </div>
          <div className="text-right">
            <p
              className={clsx(
                "font-display text-xl leading-none font-semibold",
                row.valueCop > 0 ? "text-text-primary" : "text-text-muted",
              )}
              data-numeric
            >
              {row.value}
            </p>
            <p className="mt-1 text-[0.6875rem] text-text-muted">{labels.columns.value}</p>
          </div>
        </div>

        <section className="flex-1 px-6 py-5">
          <h3 className="mb-4 text-[0.8125rem] font-medium text-text-primary">
            {labels.activity}
          </h3>

          {row.activity.length === 0 ? (
            <p className="text-[0.8125rem] text-text-muted">{labels.noActivity}</p>
          ) : (
            <ol className="relative flex flex-col gap-5 pl-5">
              {/* La línea vertical une los puntos: sin ella son viñetas sueltas
                  y se pierde la idea de recorrido. */}
              <span
                aria-hidden
                className="absolute top-1.5 bottom-1.5 left-[3px] w-px bg-border"
              />
              {row.activity.map((entry) => (
                <li key={entry.id} className="relative">
                  <span
                    aria-hidden
                    className={clsx(
                      "absolute top-1 -left-5 size-[7px] rounded-full ring-2 ring-bg",
                      DOT[entry.tone],
                    )}
                  />
                  <p className="text-[0.8125rem] leading-snug text-text-primary">{entry.text}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{entry.date}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-bg p-5">
          <Button variant="primary">{labels.newQuote}</Button>
          <Button variant="ghost">{labels.sendEmail}</Button>
        </div>
      </aside>
    </div>
  );
}
