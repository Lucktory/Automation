/**
 * Estado vacío.
 *
 * Dice qué falta y qué hacer al respecto. Una tabla vacía sin explicación se lee
 * como una pantalla rota; con una frase y una acción se lee como una pantalla
 * que todavía no tiene datos, que es otra cosa.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && (
        <p className="max-w-md text-xs text-text-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
