import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * Preguntas frecuentes.
 *
 * Con `<details>` nativo: sin JavaScript, funciona con el buscador del
 * navegador (Ctrl+F encuentra texto dentro de una respuesta cerrada) y es
 * accesible sin que tengamos que reimplementar el patrón.
 */

const QUESTIONS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");
  const common = await getTranslations("common");

  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <PageIntro title={t("faq.title")} subtitle={t("faq.subtitle")} />

        <div className="mt-8 divide-y divide-border rounded-card border border-border bg-surface">
          {QUESTIONS.map((key) => (
            <details key={key} className="group px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-text-primary">
                {t(`faq.items.${key}.q`)}
                <span
                  aria-hidden
                  className="shrink-0 text-text-muted transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-text-secondary">
                {t(`faq.items.${key}.a`)}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/simulador"
            className="inline-flex rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
          >
            {common("actions.simulate")}
          </Link>
          <Link
            href="/contacto"
            className="inline-flex rounded-control border border-border-strong px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-elevated"
          >
            {t("contact.title")}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
