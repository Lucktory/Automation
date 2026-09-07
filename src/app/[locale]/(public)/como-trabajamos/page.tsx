import {
  Anchor,
  FileCheck,
  Landmark,
  ShieldCheck,
  ShoppingCart,
  Ship,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/layout/PageIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * Cómo trabajamos.
 *
 * Las seis etapas son las MISMAS que calcula el motor en su línea de tiempo, y
 * en el mismo orden. Si el simulador dice que la nacionalización toma 18 días,
 * esta página no puede contar otra historia.
 */

const STEPS: readonly { key: string; icon: LucideIcon }[] = [
  { key: "quote", icon: ShoppingCart },
  { key: "purchase", icon: Truck },
  { key: "shipping", icon: Ship },
  { key: "customs", icon: Anchor },
  { key: "registration", icon: FileCheck },
  { key: "delivery", icon: Landmark },
];

const GUARANTEES = ["noSurprise", "traceable", "tracked"] as const;

export default async function HowItWorksPage({
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
      <main className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <PageIntro
          title={t("howItWorks.title")}
          subtitle={t("howItWorks.subtitle")}
          actions={
            <Link
              href="/simulador"
              className="inline-flex items-center rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
            >
              {common("actions.simulate")}
            </Link>
          }
        />

        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ key, icon: Icon }) => (
            <li
              key={key}
              className="rounded-card border border-border bg-surface p-5 transition-colors hover:border-border-strong"
            >
              <span className="grid size-9 place-items-center rounded-full border border-border-strong text-accent">
                <Icon size={16} aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold text-text-primary">
                {t(`howItWorks.steps.${key}.title`)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {t(`howItWorks.steps.${key}.body`)}
              </p>
            </li>
          ))}
        </ol>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-text-primary">
            {t("howItWorks.guaranteeTitle")}
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {GUARANTEES.map((key) => (
              <li
                key={key}
                className="flex gap-3 rounded-card border border-border bg-surface-elevated p-5"
              >
                <ShieldCheck size={17} aria-hidden className="mt-0.5 shrink-0 text-success" />
                <p className="text-sm leading-relaxed text-text-secondary">
                  {t(`howItWorks.guarantees.${key}`)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
