import clsx from "clsx";

/**
 * Cifra destacada de un panel.
 *
 * El número va en la fuente de titulares y con numerales tabulares, porque una
 * fila de tarjetas con cifras que bailan de ancho se lee como un borrador. El
 * acento se reserva al dato que la pantalla existe para mostrar; el resto va en
 * texto principal.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "accent" | "warning" | "success";
}) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <p className="text-[0.6875rem] tracking-[0.12em] text-text-muted uppercase">{label}</p>
      <p
        className={clsx(
          "mt-1.5 font-display text-2xl leading-none font-semibold",
          tone === "accent" && "text-accent",
          tone === "warning" && "text-warning",
          tone === "success" && "text-success",
          tone === "neutral" && "text-text-primary",
        )}
        data-numeric
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
