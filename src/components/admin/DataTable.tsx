import clsx from "clsx";

/**
 * Tabla del back-office.
 *
 * Deliberadamente casi monocromática: fondo de superficie, texto secundario, y
 * los valores numéricos en texto principal. Cuanto más densa es la pantalla,
 * menos color lleva — así una sola píldora ámbar es imposible de no ver.
 *
 * Es genérica: no nombra ningún campo. Recibe columnas y filas, igual que la
 * barra lateral recibe el árbol de navegación.
 */

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  numeric?: boolean;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isDimmed,
  emptyMessage,
}: {
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  isDimmed?: (row: T) => boolean;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-sm text-text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={clsx(
                  "px-4 py-3 text-xs font-medium tracking-wide text-text-muted uppercase",
                  column.align === "right" ? "text-right" : "text-left",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className={clsx(
                "border-b border-border transition-colors last:border-0 hover:bg-surface-elevated",
                isDimmed?.(row) && "opacity-50",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  {...(column.numeric ? { "data-numeric": true } : {})}
                  className={clsx(
                    "px-4 py-3 align-middle text-text-secondary",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Píldora de estado. El color siempre significa algo. */
export function StatusPill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "info" | "muted";
  children: React.ReactNode;
}) {
  const tones = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    info: "bg-info/15 text-info",
    muted: "bg-neutral-status/15 text-text-muted",
  } as const;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
