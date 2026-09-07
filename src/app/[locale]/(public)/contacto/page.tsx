import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { COMPANY_PROFILE } from "@/config/company";
import type { Locale } from "@/i18n/routing";
import { ContactForm } from "./ContactForm";

/**
 * Contacto.
 *
 * El formulario guarda un `Lead` de verdad, así que lo que se escribe aquí
 * aparece en el back-office. Los datos de la empresa salen del mismo registro
 * que imprime el pie del PDF: una sola dirección, no dos que se separan.
 */

const FIELD_KEYS = ["name", "email", "phone", "message"] as const;

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("site");

  const details = [
    { icon: MapPin, value: `${COMPANY_PROFILE.address}, ${COMPANY_PROFILE.city}` },
    { icon: Phone, value: COMPANY_PROFILE.phone },
    { icon: Mail, value: COMPANY_PROFILE.email },
  ] as const;

  return (
    <>
      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <PageIntro title={t("contact.title")} subtitle={t("contact.subtitle")} />

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ContactForm
              locale={locale}
              labels={{
                fields: Object.fromEntries(
                  FIELD_KEYS.map((key) => [key, t(`contact.fields.${key}`)]),
                ),
                submit: t("contact.submit"),
                note: t("contact.note"),
                sending: t("contact.sending"),
                sent: t("contact.sent"),
                invalid: t("contact.invalid"),
                failed: t("contact.failed"),
              }}
            />
          </div>

          <aside className="lg:col-span-5">
            <ul className="flex flex-col gap-3">
              {details.map(({ icon: Icon, value }) => (
                <li
                  key={value}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
                >
                  <Icon size={15} aria-hidden className="shrink-0 text-accent" />
                  <span className="text-sm text-text-secondary">{value}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 px-1 text-xs text-text-muted">
              {COMPANY_PROFILE.legalName} · NIT {COMPANY_PROFILE.nit}
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
