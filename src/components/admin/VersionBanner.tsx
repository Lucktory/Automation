import clsx from "clsx";
import { CheckCircle2, FilePenLine } from "lucide-react";

/**
 * Banner de versión del conjunto de parámetros.
 *
 * Dos estados, y la diferencia importa: en VERDE el conjunto está activo y no
 * hay nada que publicar; en ÁMBAR existe un borrador con cambios sin publicar y
 * el botón primario se enciende.
 *
 * El defecto que corregimos en el diseño generado era exactamente esta
 * incoherencia: mostraba una fila en edición con el banner en verde y el botón
 * de publicar apagado.
 */
export function VersionBanner({
  state,
  message,
  actions,
}: {
  state: "ACTIVE" | "DRAFT";
  message: string;
  actions: React.ReactNode;
}) {
  const isDraft = state === "DRAFT";
  const Icon = isDraft ? FilePenLine : CheckCircle2;

  return (
    <section
      className={clsx(
        "flex flex-wrap items-center gap-4 rounded-card border border-l-[3px] bg-surface-elevated px-5 py-4",
        isDraft ? "border-l-warning" : "border-l-success",
        "border-border",
      )}
    >
      <Icon
        size={20}
        aria-hidden
        className={isDraft ? "text-warning" : "text-success"}
      />
      <p className="flex-1 text-sm text-text-primary">{message}</p>
      <div className="flex items-center gap-2">{actions}</div>
    </section>
  );
}
