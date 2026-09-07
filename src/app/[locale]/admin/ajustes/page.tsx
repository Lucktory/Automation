import clsx from "clsx";
import { Building2, Scale } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/core/format";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Esta pantalla lee datos vivos, asi que se renderiza en cada peticion.
 *
 * Sin esto Next la prerenderiza durante el build, lo que tiene dos
 * consecuencias malas: el despliegue pasa a depender de que la base de datos
 * responda mientras compila —y un build que la consulta decenas de veces falla
 * por cualquier corte de red—, y la pagina queda congelada con los precios que
 * hubiera en ese momento hasta el siguiente despliegue. En un producto cuyo
 * valor es decir cuanto cuesta algo hoy, un precio cacheado en el build no es
 * una optimizacion: es una cifra equivocada.
 */
export const dynamic = "force-dynamic";

/**
 * Ajustes de la empresa.
 *
 * Los datos que esta pantalla edita son los que el PDF de propuesta imprime en
 * su pie: razón social, NIT, domicilio y la nota legal. No son texto de la
 * interfaz sino DATOS del emisor, así que viven fuera del catálogo de mensajes
 * y no se traducen — una razón social no cambia porque el usuario mire la app
 * en inglés. Las etiquetas, en cambio, salen todas de `admin.sections.settings`.
 *
 * El formulario se describe como una LISTA DE CAMPOS, no como JSX repetido:
 * añadir «ciudad de facturación» es añadir un objeto a `COMPANY_FIELDS`, no
 * copiar y pegar un bloque de marcado.
 */

const MS_PER_DAY = 86_400_000;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;

/** Perfil del emisor. Un día será una fila; hoy es el valor por defecto. */
interface CompanyProfile {
  readonly legalName: string;
  readonly nit: string;
  readonly address: string;
  readonly city: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
  readonly quoteFooter: string;
}

const COMPANY_PROFILE: CompanyProfile = {
  legalName: "Automoción OS Colombia S.A.S.",
  nit: "901.456.789-3",
  address: "Calle 100 # 19-61, Oficina 802",
  city: "Bogotá D.C.",
  phone: "+57 601 745 2280",
  email: "comercial@automocionos.co",
  website: "https://automocionos.co",
  quoteFooter:
    "Los valores de esta propuesta son una estimación liquidada con la TRM del día " +
    "de emisión y con los aranceles, el IVA y el impuesto al consumo vigentes en esa " +
    "fecha. La cotización tiene una validez de 15 días calendario y está sujeta a la " +
    "disponibilidad del vehículo en origen, a la aceptación de la declaración de " +
    "importación ante la DIAN y al resultado del reconocimiento aduanero. No " +
    "constituye oferta mercantil en los términos del artículo 845 del Código de Comercio.",
};

/** Los campos de la tarjeta «empresa». `quoteFooter` va aparte: es un área de texto. */
type CompanyFieldKey = Exclude<keyof CompanyProfile, "quoteFooter">;

interface CompanyField {
  readonly key: CompanyFieldKey;
  readonly type: "text" | "tel" | "email" | "url";
  readonly autoComplete: string;
  /** Ocupa las dos columnas de la rejilla. */
  readonly wide: boolean;
  /** Cifras: numerales tabulares, para que NIT y teléfono no bailen de ancho. */
  readonly numeric: boolean;
}

const COMPANY_FIELDS: readonly CompanyField[] = [
  { key: "legalName", type: "text", autoComplete: "organization", wide: true, numeric: false },
  { key: "nit", type: "text", autoComplete: "off", wide: false, numeric: true },
  { key: "city", type: "text", autoComplete: "address-level2", wide: false, numeric: false },
  { key: "address", type: "text", autoComplete: "street-address", wide: true, numeric: false },
  { key: "phone", type: "tel", autoComplete: "tel", wide: false, numeric: true },
  { key: "email", type: "email", autoComplete: "email", wide: false, numeric: false },
  { key: "website", type: "url", autoComplete: "url", wide: true, numeric: false },
];

const FIELD_CLASS =
  "rounded-control border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

/** El conjunto de parámetros donde se guardan estos ajustes. */
interface ActiveSet {
  readonly version: number;
  readonly validFrom: Date;
  readonly updatedAt: Date;
}

/**
 * Conjunto de respaldo para cuando la base todavía no está sembrada: la
 * pantalla debe verse viva, no a medio cargar.
 */
const FALLBACK_SET: ActiveSet = {
  version: 4,
  validFrom: new Date("2026-08-01T05:00:00.000Z"),
  updatedAt: new Date("2026-09-02T14:20:00.000Z"),
};

/** Una consulta que falla debe dejar la pantalla en pie, nunca tumbarla. */
async function readActiveSet(): Promise<ActiveSet> {
  try {
    const row = await prisma.pricingParameterSet.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { validFrom: "desc" },
      select: { version: true, validFrom: true, updatedAt: true },
    });

    return row ?? FALLBACK_SET;
  } catch {
    return FALLBACK_SET;
  }
}

/** Tiempo relativo con `Intl`, nunca a mano. */
function relative(date: Date, locale: Locale): string {
  const rtf = new Intl.RelativeTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    numeric: "auto",
  });
  const elapsedDays = (date.getTime() - Date.now()) / MS_PER_DAY;

  if (Math.abs(elapsedDays) >= 1) return rtf.format(Math.round(elapsedDays), "day");
  const hours = elapsedDays * HOURS_PER_DAY;
  if (Math.abs(hours) >= 1) return rtf.format(Math.round(hours), "hour");
  return rtf.format(Math.round(hours * MINUTES_PER_HOUR), "minute");
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations("admin.sections.settings");
  const tCommon = await getTranslations("common");
  const tParameters = await getTranslations("admin.parameters");

  const activeSet = await readActiveSet();
  const setLine = tParameters("version.active", {
    version: activeSet.version,
    date: formatDate(activeSet.validFrom, locale, "long"),
    ago: relative(activeSet.updatedAt, locale),
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button type="submit" form="settings-form" variant="primary" disabled>
            {tCommon("actions.save")}
          </Button>
        }
      />

      <form id="settings-form" className="flex flex-col gap-5">
        <section className="rounded-card border border-border bg-surface">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <Building2 size={16} aria-hidden className="text-text-muted" />
            <h2 className="font-display text-sm font-semibold text-text-primary">
              {t("company")}
            </h2>
          </header>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {COMPANY_FIELDS.map((field) => (
              <label
                key={field.key}
                className={clsx("flex flex-col gap-1.5", field.wide && "sm:col-span-2")}
              >
                <span className="text-sm text-text-secondary">
                  {t(`fields.${field.key}`)}
                </span>
                <input
                  name={field.key}
                  type={field.type}
                  defaultValue={COMPANY_PROFILE[field.key]}
                  autoComplete={field.autoComplete}
                  spellCheck={false}
                  className={FIELD_CLASS}
                  {...(field.numeric ? { "data-numeric": "" } : {})}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-border bg-surface">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <Scale size={16} aria-hidden className="text-text-muted" />
            <h2 className="font-display text-sm font-semibold text-text-primary">
              {t("legal")}
            </h2>
          </header>

          <div className="p-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-text-secondary">
                {t("fields.quoteFooter")}
              </span>
              <textarea
                name="quoteFooter"
                rows={6}
                defaultValue={COMPANY_PROFILE.quoteFooter}
                className={clsx(FIELD_CLASS, "resize-y leading-relaxed")}
              />
            </label>
          </div>
        </section>

        <footer className="flex flex-col gap-1 border-t border-border pt-4">
          <p className="text-xs text-text-muted">{t("savedNote")}</p>
          <p className="text-xs text-text-muted" data-numeric>
            {setLine}
          </p>
        </footer>
      </form>
    </div>
  );
}
