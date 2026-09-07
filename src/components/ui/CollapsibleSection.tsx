"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import clsx from "clsx";

/**
 * Sección colapsable del panel de parámetros.
 *
 * Se implementa con un botón y `hidden` en vez de `<details>` porque el
 * contenido lleva controles de formulario: un `<details>` cerrado los saca del
 * orden de tabulación de forma que varía entre navegadores, y aquí el estado
 * abierto/cerrado tiene que ser predecible.
 *
 * El `summary` es lo que se lee cuando la sección está plegada. Sirve para que
 * una sección cerrada siga diciendo qué hay dentro —"usando valores estándar"—
 * en lugar de esconder el dato sin más.
 */
export function CollapsibleSection({
  title,
  summary,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="border-b border-border last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-2 py-2.5 text-left"
        >
          <ChevronDown
            size={15}
            aria-hidden
            className={clsx(
              "shrink-0 text-text-muted transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span className="text-[0.8125rem] font-medium text-text-primary">{title}</span>
          {badge}
          {!open && summary && (
            <span className="ml-auto truncate text-[0.6875rem] text-text-muted">{summary}</span>
          )}
        </button>
      </h3>

      <div id={panelId} hidden={!open} className="flex flex-col gap-2.5 pb-3.5">
        {children}
      </div>
    </section>
  );
}
