"use client";

import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

/**
 * Selector que escribe un parámetro de la URL.
 *
 * Genérico a propósito: el back-office tiene ya un selector de vehículo y otro
 * de origen, y los dos hacían exactamente esto. Recibe el nombre del parámetro
 * en vez de conocerlo, así que el siguiente filtro que aparezca no trae consigo
 * un tercer componente idéntico.
 *
 * Parte de los `searchParams` actuales: elegir un origen no borra la búsqueda
 * que el usuario acababa de escribir. El valor vacío borra el parámetro en vez
 * de dejar `?origen=` colgando en la barra de direcciones.
 */
export function QuerySelect({
  param,
  value,
  label,
  options,
  stacked = false,
}: {
  param: string;
  value: string;
  label: string;
  options: readonly { value: string; label: string }[];
  /** Etiqueta encima en vez de al lado, para las barras de filtro anchas. */
  stacked?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const onChange = (next: string) => {
    const query = new URLSearchParams(params.toString());
    if (next === "") query.delete(param);
    else query.set(param, next);

    const search = query.toString();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- la ruta activa es estática; la query viaja aparte. */
    router.replace((search ? `${pathname}?${search}` : pathname) as any, { scroll: false });
  };

  return (
    <label className={stacked ? "flex flex-col gap-1" : "flex items-center gap-2"}>
      <span className="text-xs whitespace-nowrap text-text-muted">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={clsx(
            "appearance-none rounded-control border border-border bg-bg py-2 pr-8 pl-3 text-[0.8125rem] text-text-primary transition-colors hover:border-border-strong",
            stacked && "w-full sm:w-56",
          )}
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
