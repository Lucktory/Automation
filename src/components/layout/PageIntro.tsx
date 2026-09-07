/**
 * Encabezado de una página de contenido público.
 *
 * Mismo ritmo en todas: un antetítulo opcional, el título en la fuente de
 * titulares y una bajada de una o dos líneas. Es lo que hace que «Cómo
 * trabajamos», «Mapa global» y «Blog» se lean como capítulos de un mismo sitio
 * y no como tres páginas hechas por tres personas.
 */
export function PageIntro({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-[0.6875rem] tracking-[0.14em] text-accent uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-3xl leading-tight font-semibold tracking-[-0.01em] text-text-primary sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-base leading-relaxed text-text-secondary">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
