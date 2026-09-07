import clsx from "clsx";

/**
 * Botón.
 *
 * Solo dos variantes a propósito. La regla del sistema es «un botón primario
 * por banda»: si dos acciones compiten, la secundaria es fantasma. Añadir una
 * tercera variante decorativa rompería esa jerarquía.
 *
 * El acento (#00D0C0) NO está disponible aquí: marca datos, nunca acciones.
 */
export function Button({
  variant = "ghost",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variant === "primary"
          ? "bg-primary text-primary-fg hover:bg-primary-hover"
          : "border border-border-strong text-text-primary hover:bg-surface-elevated",
        className,
      )}
      {...props}
    />
  );
}
