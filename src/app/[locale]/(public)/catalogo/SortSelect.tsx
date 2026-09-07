"use client";

import { ChevronDown } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

/**
 * Selector de orden.
 *
 * Es cliente sólo para navegar: al elegir una opción reescribe `?orden=` y deja
 * que el servidor vuelva a consultar. El orden NO se hace en el navegador — con
 * un catálogo grande habría que traerse todas las fichas para ordenarlas, y el
 * resultado no sería compartible por URL.
 *
 * Conserva los filtros activos porque parte de los `searchParams` actuales en
 * vez de construir una query nueva: cambiar el orden no debe borrar la marca
 * que el usuario acababa de elegir.
 */
export function SortSelect({
  value,
  label,
  options,
}: {
  value: string;
  label: string;
  options: readonly { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const onChange = (next: string) => {
    const query = new URLSearchParams(params.toString());
    if (next === "relevant") query.delete("orden");
    else query.set("orden", next);

    const search = query.toString();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- la ruta activa es estática; la query viaja aparte. */
    router.replace((search ? `${pathname}?${search}` : pathname) as any, { scroll: false });
  };

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs whitespace-nowrap text-text-muted">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="appearance-none rounded-control border border-border bg-bg py-2 pr-8 pl-3 text-[0.8125rem] text-text-primary transition-colors hover:border-border-strong"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-text-muted"
        />
      </span>
    </label>
  );
}
