import clsx from "clsx";
import type { PillTone } from "@/config/role-display";

/**
 * Píldora y punto de estado.
 *
 * El color siempre significa algo: aquí codifica rol o estado, nunca decora.
 * Los tonos salen del registro `role-display`, no de decisiones sueltas en cada
 * pantalla, para que "Administrador" sea ámbar en todo el back-office.
 */

const TONES: Record<PillTone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
  primary: "bg-primary/15 text-primary",
  muted: "bg-neutral-status/15 text-text-muted",
};

const DOTS: Record<PillTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  primary: "bg-primary",
  muted: "bg-neutral-status",
};

export function Pill({
  tone,
  children,
}: {
  tone: PillTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Punto de color + etiqueta. Para estados, donde la píldora sería demasiado peso. */
export function StatusDot({
  tone,
  children,
}: {
  tone: PillTone;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-text-secondary">
      <span aria-hidden className={clsx("size-2 shrink-0 rounded-full", DOTS[tone])} />
      {children}
    </span>
  );
}
