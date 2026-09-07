import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import { formatDate, formatRate } from "@/core/format";
import type { Locale } from "@/i18n/routing";

/**
 * Insignia de TRM.
 *
 * Comunica tres cosas a la vez: el valor, su fecha y de dónde salió. El punto
 * de color es el estado de FRESCURA, no decoración: verde significa que el dato
 * vino de la fuente oficial y está vigente; ámbar, que se está usando un
 * override manual o un valor envejecido.
 */
export function TrmBadge({
  rate,
  date,
  source,
  ageDays,
  staleAfterDays,
  locale,
  labels,
}: {
  rate: number;
  date: Date;
  source: "AUTO" | "MANUAL" | "CACHE";
  ageDays: number;
  staleAfterDays: number;
  locale: Locale;
  labels: {
    prefix: string;
    source: Record<"AUTO" | "MANUAL" | "CACHE", string>;
  };
}) {
  const degraded = ageDays > staleAfterDays || source === "MANUAL";

  return (
    <div
      className="flex items-center gap-2 rounded-control border border-border bg-surface-elevated px-3 py-1.5"
      data-numeric
    >
      <span
        aria-hidden
        className={clsx(
          "size-2 shrink-0 rounded-full",
          degraded ? "bg-warning" : "bg-success",
        )}
      />
      <span className="text-xs text-text-muted">{labels.prefix}</span>
      <span className="text-sm font-medium text-text-primary">
        {formatRate(rate, locale)}
      </span>
      {/* La fecha y la fuente son contexto, no el dato: en pantallas estrechas
          se retiran antes que la cifra, que es lo que nunca puede faltar. */}
      <span className="hidden text-xs text-text-muted sm:inline">
        · {formatDate(date, locale, "short")} · {labels.source[source]}
      </span>
      <RefreshCw size={13} className="ml-0.5 shrink-0 text-text-muted" aria-hidden />
    </div>
  );
}
