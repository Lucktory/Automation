"use client";

import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";

/**
 * Selector de vehículo del catálogo.
 *
 * Muestra la unidad elegida como ficha —miniatura, marca, modelo, versión y
 * año— y abre un buscador para cambiarla. El buscador filtra en el cliente
 * porque la lista publicada del simulador es corta; cuando el catálogo crezca,
 * el filtrado sube al servidor y este componente no cambia: ya recibe la lista
 * como propiedad.
 *
 * Cuando la unidad no tiene fotografía se dibuja un monograma de la marca. No
 * se usa una imagen de otro vehículo como relleno: en una pantalla que cotiza
 * dinero, una foto que no corresponde es peor que ninguna.
 */

export interface PickableVehicle {
  id: string;
  label: string;
  modelYear: number;
  originCountry: string;
  powertrain: string;
  imageUrl: string | null;
}

function monogram(label: string): string {
  return label.trim().slice(0, 2).toUpperCase();
}

export function VehiclePicker({
  vehicles,
  selectedId,
  onSelect,
  disabled = false,
  labels,
  countryName,
}: {
  vehicles: readonly PickableVehicle[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  labels: { change: string; search: string; empty: string; close: string };
  countryName: (code: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = vehicles.find((vehicle) => vehicle.id === selectedId) ?? vehicles[0];

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return vehicles;
    return vehicles.filter((vehicle) =>
      `${vehicle.label} ${vehicle.modelYear} ${countryName(vehicle.originCountry)}`
        .toLowerCase()
        .includes(needle),
    );
  }, [vehicles, query, countryName]);

  if (!selected) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-card border border-border bg-bg p-2.5">
        {selected.imageUrl ? (
          // `img` y no `next/image`: la URL viene del catálogo, de dominios que
          // el cliente todavía no ha fijado, y `next/image` exige declararlos.
          <img
            src={selected.imageUrl}
            alt=""
            className="size-14 shrink-0 rounded-control object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-control bg-surface-elevated font-display text-sm font-semibold text-text-muted"
          >
            {monogram(selected.label)}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text-primary">
            {selected.label}
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">
            {selected.modelYear} · {countryName(selected.originCountry)}
          </span>
        </span>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={disabled}
          aria-expanded={open}
          className="shrink-0 rounded-control border border-border-strong px-3 py-1.5 text-xs text-text-primary transition-colors hover:bg-surface-elevated disabled:opacity-40"
        >
          {open ? labels.close : labels.change}
        </button>
      </div>

      {open && (
        <div className="rounded-card border border-border bg-bg">
          <label className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={14} aria-hidden className="shrink-0 text-text-muted" />
            <span className="sr-only">{labels.search}</span>
            <input
              type="search"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.search}
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </label>

          {matches.length === 0 ? (
            <p className="px-3 py-4 text-xs text-text-muted">{labels.empty}</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {matches.map((vehicle) => {
                const isSelected = vehicle.id === selected.id;
                return (
                  <li key={vehicle.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(vehicle.id);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={clsx(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-elevated",
                        isSelected && "bg-surface-elevated",
                      )}
                    >
                      <span
                        aria-hidden
                        className="grid size-8 shrink-0 place-items-center rounded-control bg-surface text-[0.625rem] font-semibold text-text-muted"
                      >
                        {monogram(vehicle.label)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] text-text-primary">
                          {vehicle.label}
                        </span>
                        <span className="block text-xs text-text-muted">
                          {vehicle.modelYear} · {countryName(vehicle.originCountry)}
                        </span>
                      </span>
                      {isSelected && (
                        <Check size={14} aria-hidden className="shrink-0 text-accent" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
