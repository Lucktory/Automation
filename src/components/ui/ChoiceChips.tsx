"use client";

import clsx from "clsx";

/**
 * Grupo de opciones excluyentes en forma de chips.
 *
 * Una opción sin dato detrás se muestra DESHABILITADA con su motivo, en vez de
 * ocultarse. Ocultarla deja al usuario preguntándose si la modalidad existe;
 * mostrarla apagada con "sin tarifa en esta ruta" responde la pregunta y, de
 * paso, le dice al administrador qué le falta por cargar.
 */

export interface Choice {
  value: string;
  label: string;
  /** Prefijo decorativo: bandera, icono. Se marca `aria-hidden`. */
  prefix?: React.ReactNode;
  disabled?: boolean;
  /** Motivo de la deshabilitación; se muestra como `title`. */
  disabledReason?: string;
}

export function ChoiceChips({
  choices,
  value,
  onChange,
  ariaLabel,
  size = "md",
}: {
  choices: readonly Choice[];
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {choices.map((choice) => {
        const isSelected = choice.value === value;
        return (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            disabled={choice.disabled}
            aria-pressed={isSelected}
            {...(choice.disabled && choice.disabledReason
              ? { title: choice.disabledReason }
              : {})}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border transition-colors",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[0.8125rem]",
              choice.disabled
                ? "cursor-not-allowed border-border text-text-muted opacity-45"
                : isSelected
                  ? "border-primary bg-primary/12 text-text-primary"
                  : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
            )}
          >
            {choice.prefix && (
              <span aria-hidden className="flex shrink-0 items-center leading-none">
                {choice.prefix}
              </span>
            )}
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}
