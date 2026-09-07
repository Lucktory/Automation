/**
 * Encabezado de una pantalla del back-office.
 *
 * Todas las secciones lo usan, así que el título, la descripción y la banda de
 * acciones caen siempre en el mismo sitio. Es lo que hace que trece pantallas
 * distintas se lean como un mismo producto y no como trece pantallas.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-semibold text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
