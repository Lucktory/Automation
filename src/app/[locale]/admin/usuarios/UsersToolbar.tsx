"use client";

import { Download, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Barra de filtros.
 *
 * Los filtros se APLICAN al cambiarlos. La versión anterior era un formulario
 * cuyo único botón decía "Exportar": elegir un rol no hacía nada, y el botón
 * que parecía aplicar el filtro en realidad exportaba. Se veía un desplegable
 * en "Editor" junto a una tabla sin filtrar.
 *
 * El estado vive en la URL, así que una búsqueda es compartible y el botón de
 * atrás del navegador funciona.
 */

const SEARCH_DEBOUNCE_MS = 350;

export interface Choice {
  value: string;
  label: string;
}

export function UsersToolbar({
  roles,
  statuses,
  labels,
}: {
  roles: readonly Choice[];
  statuses: readonly Choice[];
  labels: {
    searchPlaceholder: string;
    allRoles: string;
    allStatuses: string;
    export: string;
    exporting: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);
  const firstRender = useRef(true);

  const apply = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === "") next.delete(key);
      else next.set(key, value);
    }
    // Cualquier cambio de filtro vuelve a la primera página: quedarse en la
    // página 3 de un resultado que ahora tiene una sola es una pantalla vacía
    // sin explicación.
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  };

  // Búsqueda con retardo: una petición por pulsación saturaría al servidor y
  // haría parpadear la tabla.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => apply({ q: query }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // `apply` se recrea en cada render; incluirlo reiniciaría el temporizador
    // en bucle. La única entrada real de este efecto es el texto buscado.
  }, [query]);

  async function exportCsv() {
    setExporting(true);
    try {
      const response = await fetch(`/api/admin/users/export?${params.toString()}`);
      if (!response.ok) return;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "usuarios.csv";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const select =
    "rounded-control border border-border bg-bg px-3 py-2 text-sm text-text-secondary";

  return (
    <div
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center"
      data-pending={pending ? "" : undefined}
    >
      <label className="relative min-w-0 flex-1">
        <Search
          size={15}
          aria-hidden
          className="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchPlaceholder}
          className="w-full rounded-control border border-border bg-bg py-2 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-muted"
        />
      </label>

      <select
        value={params.get("rol") ?? ""}
        onChange={(event) => apply({ rol: event.target.value })}
        aria-label={labels.allRoles}
        className={select}
      >
        <option value="">{labels.allRoles}</option>
        {roles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>

      <select
        value={params.get("estado") ?? ""}
        onChange={(event) => apply({ estado: event.target.value })}
        aria-label={labels.allStatuses}
        className={select}
      >
        <option value="">{labels.allStatuses}</option>
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      <Button
        type="button"
        size="sm"
        onClick={exportCsv}
        disabled={exporting}
        className="shrink-0"
      >
        <Download size={14} aria-hidden />
        {exporting ? labels.exporting : labels.export}
      </Button>
    </div>
  );
}
