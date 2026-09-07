import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { COMPANY_PROFILE } from "@/config/company";
import { LEGAL_DOCUMENTS, legalBySlug } from "@/config/legal-content";
import { Link } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";

/**
 * Documentos legales.
 *
 * Existen porque hay enlaces que apuntan aquí: el consentimiento de habeas data
 * del registro, y los términos y la privacidad del pie. Un enlace legal que
 * lleva a un 404 es peor que no tenerlo — en Colombia el tratamiento de datos
 * personales exige que la política sea consultable en el momento de recogerlos
 * (Ley 1581 de 2012).
 */

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    LEGAL_DOCUMENTS.map((doc) => ({ locale, slug: doc.slug })),
  );
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");

  const doc = legalBySlug(slug);
  if (!doc) notFound();

  const isEs = locale === "es";
  const sections = isEs ? doc.sectionsEs : doc.sectionsEn;

  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={13} aria-hidden />
          {t("footer.legal")}
        </Link>

        <div className="mt-4">
          <PageIntro title={isEs ? doc.titleEs : doc.titleEn} />
        </div>

        <div className="mt-8 flex flex-col gap-7">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-base font-semibold text-text-primary">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="mt-2 text-sm leading-relaxed text-text-secondary"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-10 border-t border-border pt-5 text-xs text-text-muted">
          {COMPANY_PROFILE.legalName} · NIT {COMPANY_PROFILE.nit} ·{" "}
          {COMPANY_PROFILE.address}, {COMPANY_PROFILE.city} · {COMPANY_PROFILE.email}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
