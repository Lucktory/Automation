import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { Locale } from "@/i18n/routing";

/**
 * Envoltura de las páginas públicas.
 *
 * El encabezado del sitio vive aquí y no en cada página: el diseño lo repite en
 * el simulador, el catálogo y la consolidación, y una copia por pantalla es
 * justo como empiezan a divergir. Las rutas de autenticación y del back-office
 * quedan fuera del grupo porque tienen su propia envoltura.
 *
 * El grupo `(public)` no aparece en la URL, así que `/es/simulador` sigue
 * siendo `/es/simulador`.
 */
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale as Locale} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
