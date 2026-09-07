import * as Icons from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import clsx from "clsx";
import { ImpactPanel } from "@/components/admin/ImpactPanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { TrmBadge } from "@/components/admin/TrmBadge";
import { VersionBanner } from "@/components/admin/VersionBanner";
import { Button } from "@/components/ui/Button";
import { parametersDeps } from "@/composition/container";
import { PARAMETER_TABS, parameterTabBySlug } from "@/config/navigation";
import { IMPACT_SAMPLE } from "@/config/impact-sample";
import { formatDate } from "@/core/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getTariffScreen, simulateImpact } from "@/modules/parameters";
import { publishDraftFormAction } from "./actions";
import { AddOnsSection } from "./sections/AddOnsSection";
import { DestinationSection } from "./sections/DestinationSection";
import { FreightSection } from "./sections/FreightSection";
import { FxSection } from "./sections/FxSection";
import { MarginsSection } from "./sections/MarginsSection";
import { TariffsSection } from "./sections/TariffsSection";

/**
 * Parámetros del motor de cálculo.
 *
 * Seis secciones, una por familia de reglas. Las pestañas son ENLACES de verdad
 * —antes eran `<span>`, de modo que cinco de las seis no llevaban a ninguna
 * parte y sólo «Aranceles» aparecía marcada, a mano—. Ahora la sección activa
 * sale de la URL, así que se puede compartir, el botón atrás funciona y no hay
 * forma de añadir una pestaña al registro sin darle destino.
 *
 * La barra de pestañas es HORIZONTAL. Como raíl lateral de dos columnas dejaba
 * un recuadro alto y casi vacío junto a una tabla de nueve columnas metida en
 * medio ancho, que es lo que hacía ilegible la pantalla: la tabla es el
 * contenido, y se lleva el ancho entero.
 */

const PAGE_SIZE = 25;
const MS_PER_DAY = 86_400_000;

export default async function ParametersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; seccion?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const { page: rawPage, seccion } = await searchParams;
  const page = Math.max(1, Number(rawPage ?? "1") || 1);
  const tab = parameterTabBySlug(seccion);

  const t = await getTranslations("admin.parameters");
  const screen = await getTariffScreen(parametersDeps, { page, pageSize: PAGE_SIZE });

  // Sin conjunto activo no hay nada que editar. Se dice explícitamente en vez
  // de mostrar una tabla vacía que parece un error de carga.
  if (!screen.editingSet) {
    return (
      <section className="rounded-card border border-border bg-surface p-12 text-center">
        <h1 className="font-display text-lg text-text-primary">{t("title")}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">{t("empty")}</p>
      </section>
    );
  }

  const isDraft = screen.draftSet !== null;
  const now = new Date();
  const setId = screen.editingSet.id;

  // El impacto sólo se calcula donde significa algo: comparar dos conjuntos
  // tiene sentido mirando aranceles, no mirando el histórico de la TRM.
  const impact =
    tab.key === "tariffs" && screen.draftSet && screen.activeSet
      ? await simulateImpact(parametersDeps, {
          activeSetId: screen.activeSet.id,
          draftSetId: screen.draftSet.id,
          sample: { ...IMPACT_SAMPLE, tariff: PLACEHOLDER_TARIFF },
        }).catch(() => null)
      : null;

  const totalPages = Math.max(1, Math.ceil(screen.totalRules / PAGE_SIZE));

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          screen.latestFx ? (
            <TrmBadge
              rate={screen.latestFx.rate}
              date={screen.latestFx.validFrom}
              source={screen.latestFx.source === "MANUAL" ? "MANUAL" : "AUTO"}
              ageDays={Math.floor(
                (now.getTime() - screen.latestFx.validFrom.getTime()) / MS_PER_DAY,
              )}
              staleAfterDays={1}
              locale={locale}
              labels={{
                prefix: t("trm.prefix"),
                source: {
                  AUTO: t("trm.source.AUTO"),
                  MANUAL: t("trm.source.MANUAL"),
                  CACHE: t("trm.source.CACHE"),
                },
              }}
            />
          ) : undefined
        }
      />

      <VersionBanner
        state={isDraft ? "DRAFT" : "ACTIVE"}
        message={
          isDraft
            ? t("version.draft", {
                version: screen.draftSet!.version,
                count: screen.draftSet!.pendingChanges,
              })
            : t("version.active", {
                version: screen.activeSet?.version ?? 0,
                date: screen.activeSet
                  ? formatDate(screen.activeSet.validFrom, locale, "long")
                  : "—",
                ago: screen.activeSet
                  ? formatDate(screen.activeSet.updatedAt, locale, "short")
                  : "—",
              })
        }
        actions={
          <>
            <Button size="sm">{t("actions.history")}</Button>
            <form action={publishDraftFormAction}>
              <input type="hidden" name="draftId" value={screen.draftSet?.id ?? ""} />
              <Button size="sm" variant="primary" type="submit" disabled={!isDraft}>
                {t("actions.publish")}
              </Button>
            </form>
          </>
        }
      />

      {/* Pestañas: subrayado sobre una línea, no un recuadro. Encerrarlas en una
          tarjeta con el mismo borde que la tabla las pone a competir con ella. */}
      <nav aria-label={t("title")} className="-mb-px border-b border-border">
        <ul className="flex gap-1 overflow-x-auto">
          {PARAMETER_TABS.map((item) => {
            const active = item.key === tab.key;
            const Icon =
              (Icons[item.icon as keyof typeof Icons] as Icons.LucideIcon | undefined) ??
              Icons.Circle;

            return (
              <li key={item.key}>
                <Link
                  href={{ pathname: "/admin/parametros", query: { seccion: item.slug } }}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors",
                    active
                      ? "border-primary font-medium text-text-primary"
                      : "border-transparent text-text-secondary hover:border-border-strong hover:text-text-primary",
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} aria-hidden />
                  {t(`tabs.${item.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={clsx(
          "grid min-w-0 gap-5",
          impact ? "grid-cols-1 xl:grid-cols-4" : "grid-cols-1",
        )}
      >
        {/* `min-w-0` es lo que evita que una tabla ancha empuje la rejilla más
            allá del viewport y arrastre consigo la cabecera de la página. Sin
            él, un elemento de rejilla no puede encogerse por debajo del ancho
            de su contenido y toda la pantalla se desplaza a la derecha. */}
        <section
          className={clsx(
            "min-w-0 rounded-card border border-border bg-surface",
            impact && "xl:col-span-3",
          )}
        >
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-text-primary">
                {t(`${tab.key}.title`)}
              </h2>
              <p className="mt-1 text-xs text-text-muted">{t(`${tab.key}.subtitle`)}</p>
            </div>
            {tab.key === "tariffs" && (
              <span className="text-xs text-text-muted" data-numeric>
                {t("tariffs.showing", {
                  count: screen.rules.length,
                  total: screen.totalRules,
                })}
              </span>
            )}
          </header>

          {tab.key === "fx" && <FxSection locale={locale} />}
          {tab.key === "freight" && <FreightSection locale={locale} setId={setId} />}
          {tab.key === "tariffs" && <TariffsSection locale={locale} rules={screen.rules} />}
          {tab.key === "destination" && <DestinationSection locale={locale} setId={setId} />}
          {tab.key === "addons" && <AddOnsSection locale={locale} setId={setId} />}
          {tab.key === "margins" && <MarginsSection locale={locale} setId={setId} />}

          {/* La paginación sólo existe donde hay páginas que pasar. */}
          {tab.key === "tariffs" && totalPages > 1 && (
            <footer className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-text-muted">
              <span data-numeric>{t("tariffs.pageOf", { page, total: totalPages })}</span>
              <span className="flex gap-3">
                {page > 1 && (
                  <Link
                    href={{
                      pathname: "/admin/parametros",
                      query: { seccion: tab.slug, page: String(page - 1) },
                    }}
                    className="text-primary hover:underline"
                  >
                    ‹
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={{
                      pathname: "/admin/parametros",
                      query: { seccion: tab.slug, page: String(page + 1) },
                    }}
                    className="text-primary hover:underline"
                  >
                    ›
                  </Link>
                )}
              </span>
            </footer>
          )}
        </section>

        {impact && (
          <aside className="min-w-0">
            <ImpactPanel impact={impact} locale={locale} />
          </aside>
        )}
      </div>
    </div>
  );
}

/**
 * El panel de impacto sustituye esta regla por la que resuelve cada conjunto;
 * solo existe para satisfacer la forma del input antes de las dos corridas.
 */
const PLACEHOLDER_TARIFF = {
  ruleId: "placeholder",
  dutyRate: 0,
  vatRate: 0,
  exciseRate: 0,
  dutyBase: "CIF",
  vatBase: "CIF_PLUS_ARANCEL",
  exciseBase: "TOTAL_VALUE_EXCL_IVA",
  exciseThresholdFobUsd: null,
  exciseRateAboveThreshold: null,
  exciseAppliesOnImport: false,
  requiresOriginCertificate: false,
  legalBasis: "placeholder",
  confidence: "VERIFIED",
  status: "VALOR",
} as const;
