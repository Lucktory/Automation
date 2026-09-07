"use client";

import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

/**
 * Campo de búsqueda de una tabla del back-office.
 *
 * Escribe en `?q=` y deja que el servidor vuelva a consultar. Filtrar en el
 * navegador obligaría a traerse la tabla entera —y con una cartera de miles de
 * personas eso no escala—, además de que la vista filtrada dejaría de poder
 * compartirse por URL.
 *
 * Espera a que el usuario deje de teclear antes de navegar. Sin esa pausa cada
 * pulsación sería una consulta y la tabla parpadearía a cada letra.
 *
 * `useTransition` mantiene el campo escribible mientras llega el resultado: sin
 * él la entrada se congela a media palabra y se pierden pulsaciones.
 */

const DEBOUNCE_MS = 300;

export function TableSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const current = params.get("q") ?? "";
  const [value, setValue] = useState(current);

  // El valor de la URL manda cuando cambia por fuera —botón atrás, «quitar
  // filtros»—, pero no debe pisar lo que el usuario está tecleando: por eso se
  // compara antes de asignar, y no se reinicia el campo en cada render.
  useEffect(() => {
    setValue((typed) => (typed === current ? typed : current));
  }, [current]);

  useEffect(() => {
    if (value === current) return;

    const timer = window.setTimeout(() => {
      const query = new URLSearchParams(params.toString());
      if (value.trim() === "") query.delete("q");
      else query.set("q", value.trim());

      const search = query.toString();
      startTransition(() => {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- la ruta activa es estática; la query viaja aparte. */
        router.replace((search ? `${pathname}?${search}` : pathname) as any, { scroll: false });
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [value, current, params, pathname, router]);

  return (
    <label className="relative block w-full sm:w-80">
      <Search
        size={15}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
      />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-control border border-border bg-bg py-2 pr-3 pl-9 text-[0.8125rem] text-text-primary transition-colors placeholder:text-text-muted hover:border-border-strong focus:border-primary focus:outline-none"
      />
    </label>
  );
}
