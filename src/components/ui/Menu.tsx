"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/**
 * Menú desplegable.
 *
 * Cierra al hacer clic fuera, al pulsar Escape y al elegir una opción. Los tres
 * hacen falta: un menú que solo cierra con su propio botón deja al usuario
 * atrapado en cuanto la interfaz tiene dos de ellos.
 */
export function Menu({
  trigger,
  label,
  align = "start",
  children,
}: {
  trigger: (props: { open: boolean }) => React.ReactNode;
  label: string;
  align?: "start" | "end";
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="inline-flex items-center rounded-control text-text-muted hover:text-text-primary"
      >
        {trigger({ open })}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className={clsx(
            "absolute bottom-full z-50 mb-2 min-w-52 overflow-hidden rounded-card border border-border bg-surface-elevated py-1 shadow-2xl",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Opción de menú. `tone="danger"` para las destructivas. */
export function MenuItem({
  onSelect,
  tone = "default",
  children,
}: {
  onSelect: () => void;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={clsx(
        "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface",
        tone === "danger" ? "text-danger" : "text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}
