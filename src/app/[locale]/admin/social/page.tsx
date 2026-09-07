import type { SocialTemplate } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import clsx from "clsx";
import { PageHeader } from "@/components/admin/PageHeader";
import { QuerySelect } from "@/components/admin/QuerySelect";
import { SocialPieceCard } from "@/components/admin/SocialPieceCard";
import type { SocialPieceProps } from "@/components/admin/SocialPiece";
import { ActionDialog } from "@/components/ui/ActionDialog";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import {
  SOCIAL_TEMPLATES,
  SOCIAL_TEMPLATE_ORDER,
  SOCIAL_TEMPLATES_DEFAULT,
  dimensionsOf,
} from "@/config/social-templates";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALE, LOCALES, type Locale } from "@/i18n/routing";
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
 * Biblioteca de piezas sociales.
 *
 * Una pieza es una imagen DERIVADA: nace de la ficha del vehículo y de su costo
 * puesto en Colombia. Por eso la pantalla es una rejilla de creatividades y no
 * una tabla — lo que aquí se revisa es el ENCUADRE, si el precio se lee sobre la
 * foto y si el titular tapa el coche, y eso no cabe en una celda de texto.
 *
 * Cada tarjeta pinta la pieza de verdad, con la misma fotografía y la misma
 * cifra que llevaría la imagen exportada. Las alturas salen desiguales a
 * propósito: una historia vertical y una imagen para enlaces no tienen la misma
 * forma, y una rejilla que las iguala miente sobre lo que se va a publicar.
 *
 * Los filtros son ENLACES resueltos en el servidor, así que la vista filtrada
 * se puede compartir y el botón atrás funciona.
 */

const PIECE_LIMIT = 40;

/** Marcador de dato ausente. No es texto de interfaz, es un guion. */
const UNKNOWN = "—";

interface PieceRow {
  id: string;
  vehicleSlug: string;
  vehicleName: string;
  template: SocialTemplate;
  imageUrl: string;
  priceCop: number | null;
  isPublished: boolean;
  createdAt: Date;
}

/** El nombre comercial vive repartido en marca → modelo → versión. */
function vehicleName(parts: {
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
}): string {
  const label = [parts.brand, parts.model, parts.trim]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
  return label.length > 0 ? label : UNKNOWN;
}

export default async function SocialPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const sp = await searchParams;
  const template = SOCIAL_TEMPLATE_ORDER.includes(sp.plantilla as SocialTemplate)
    ? (sp.plantilla as SocialTemplate)
    : null;
  const vehicleSlug = sp.vehiculo ?? "";

  const t = await getTranslations("admin.sections.social");
  const d = await getTranslations("admin.dialog");

  const [rows, totals, vehicleOptions] = await Promise.all([
    prisma.socialAsset
      .findMany({
        where: {
          ...(template ? { template } : {}),
          ...(vehicleSlug ? { vehicle: { slug: vehicleSlug } } : {}),
        },
        take: PIECE_LIMIT,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          template: true,
          imageUrl: true,
          status: true,
          createdAt: true,
          vehicle: {
            select: {
              slug: true,
              estLandedCop: true,
              trim: {
                select: { name: true, model: { select: { name: true, brand: { select: { name: true } } } } },
              },
            },
          },
        },
      })
      .then((found) =>
        found.map<PieceRow>((row) => ({
          id: row.id,
          vehicleSlug: row.vehicle?.slug ?? "",
          vehicleName: vehicleName({
            brand: row.vehicle?.trim?.model?.brand?.name,
            model: row.vehicle?.trim?.model?.name,
          }),
          template: row.template,
          imageUrl: row.imageUrl,
          priceCop: row.vehicle?.estLandedCop ? Number(row.vehicle.estLandedCop) : null,
          isPublished: row.status === "PUBLISHED",
          createdAt: row.createdAt,
        })),
      )
      .catch(() => [] as PieceRow[]),

    // Las cuatro cifras de cabecera se cuentan sobre la biblioteca ENTERA, no
    // sobre lo filtrado: son el estado del trabajo, no del filtro.
    Promise.all([
      prisma.socialAsset.count().catch(() => 0),
      prisma.socialAsset
        .findMany({ distinct: ["vehicleId"], select: { vehicleId: true } })
        .then((v) => v.length)
        .catch(() => 0),
      prisma.socialAsset.count({ where: { status: "PUBLISHED" } }).catch(() => 0),
    ]),

    prisma.vehicle
      .findMany({
        where: { isPublished: true, socialCards: { some: {} } },
        orderBy: { slug: "asc" },
        select: {
          slug: true,
          trim: {
            select: { model: { select: { name: true, brand: { select: { name: true } } } } },
          },
        },
      })
      .then((found) =>
        found.map((v) => ({
          value: v.slug,
          label: vehicleName({
            brand: v.trim?.model?.brand?.name,
            model: v.trim?.model?.name,
          }),
        })),
      )
      .catch(() => [] as { value: string; label: string }[]),
  ]);

  const [generated, withPieces, published] = totals;
  const intl = INTL_LOCALE[locale];
  const money = (value: number) =>
    `COP $ ${new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(value)}`;
  const shortDate = (value: Date) =>
    new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", year: "numeric" }).format(value);

  /** Un filtro es un enlace: la vista filtrada es compartible. */
  const hrefWith = (patch: { plantilla?: string | null; vehiculo?: string | null }) => {
    const query: Record<string, string> = {};
    if (template) query.plantilla = template;
    if (vehicleSlug) query.vehiculo = vehicleSlug;
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete query[key];
      else if (value !== undefined) query[key] = value;
    }
    return { pathname: "/admin/social" as const, query };
  };

  const cardLabels = {
    download: t("actions.download"),
    copyLink: t("actions.copyLink"),
    publish: t("actions.publish"),
    unpublish: t("actions.unpublish"),
    regenerate: t("actions.regenerate"),
    delete: t("actions.delete"),
    menu: t("rowMenu"),
    copied: t("actions.copied"),
  };

  const generateDialog = (
    <ActionDialog
      trigger={t("generate")}
      title={d("generateAssets.title")}
      description={d("generateAssets.description")}
      submitLabel={d("submit")}
      cancelLabel={d("cancel")}
      closeLabel={d("close")}
      confirmation={d("queued")}
      fields={[
        {
          name: "vehicle",
          label: d("generateAssets.vehicle"),
          type: "select",
          options: vehicleOptions,
          ...(vehicleSlug ? { defaultValue: vehicleSlug } : {}),
        },
        {
          name: "templates",
          label: d("generateAssets.format"),
          type: "checkboxes",
          // Las plantillas reales del registro, con su tamaño: quien genera
          // tiene que saber qué formato está pidiendo, no sólo su nombre.
          options: SOCIAL_TEMPLATE_ORDER.map((key) => ({
            value: key,
            label: `${t(`templates.${SOCIAL_TEMPLATES[key].key}`)} · ${dimensionsOf(key)}`,
          })),
          defaultChecked: SOCIAL_TEMPLATES_DEFAULT,
        },
        {
          name: "locale",
          label: d("generateAssets.locale"),
          type: "select",
          options: LOCALES.map((code) => ({ value: code, label: code.toUpperCase() })),
          defaultValue: locale,
        },
      ]}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")} description={t("description")} actions={generateDialog} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("stats.generated")} value={String(generated)} />
        <StatCard label={t("stats.vehicles")} value={String(withPieces)} />
        <StatCard label={t("stats.published")} value={String(published)} />
        <StatCard
          label={t("stats.unpublished")}
          value={String(Math.max(0, generated - published))}
          tone={generated - published > 0 ? "warning" : "success"}
        />
      </section>

      {/* Barra de filtros: sin caja. Encerrarla en una tarjeta con el mismo
          borde que las piezas la pone a competir con lo que hay que mirar. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("title")}>
          <Link
            href={hrefWith({ plantilla: null })}
            aria-current={template === null ? "true" : undefined}
            className={clsx(
              "rounded-full border px-4 py-2 text-[0.8125rem] transition-colors",
              template === null
                ? "border-text-primary bg-text-primary font-medium text-bg"
                : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
            )}
          >
            {t("filterAll")}
          </Link>

          {SOCIAL_TEMPLATE_ORDER.map((key) => {
            const spec = SOCIAL_TEMPLATES[key];
            const active = template === key;
            return (
              <Link
                key={key}
                href={hrefWith({ plantilla: key })}
                aria-current={active ? "true" : undefined}
                className={clsx(
                  "rounded-full border px-4 py-1.5 text-center transition-colors",
                  active
                    ? "border-text-primary bg-text-primary text-bg"
                    : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
                )}
              >
                <span className="block text-[0.8125rem] leading-tight">
                  {t(`templates.${spec.key}`)}
                </span>
                <span
                  className={clsx(
                    "block text-[0.6875rem] leading-tight",
                    active ? "text-bg/70" : "text-text-muted",
                  )}
                  data-numeric
                >
                  {dimensionsOf(key)}
                </span>
              </Link>
            );
          })}
        </div>

        <QuerySelect
          param="vehiculo"
          stacked
          value={vehicleSlug}
          label={t("filterVehicle")}
          options={[{ value: "", label: t("filterAllVehicles") }, ...vehicleOptions]}
        />
      </div>

      {rows.length === 0 ? (
        <section className="border-t border-border">
          <EmptyState
            title={generated === 0 ? t("empty") : t("emptyFiltered")}
            action={
              generated === 0 ? (
                generateDialog
              ) : (
                <Link href={{ pathname: "/admin/social", query: {} }}>
                  <Button variant="ghost">{t("clearFilters")}</Button>
                </Link>
              )
            }
          />
        </section>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((row) => {
            const spec = SOCIAL_TEMPLATES[row.template];
            const piece: SocialPieceProps = {
              layout: spec.layout,
              width: spec.width,
              height: spec.height,
              imageUrl: row.imageUrl,
              headline: row.vehicleName,
              claim: t("pieceClaim"),
              price: row.priceCop === null ? UNKNOWN : money(row.priceCop),
              priceLabel: t("landedLabel"),
              cta: t("pieceCta"),
            };

            return (
              <SocialPieceCard
                key={row.id}
                piece={piece}
                vehicle={row.vehicleName}
                meta={`${t(`templates.${spec.key}`)} · ${dimensionsOf(row.template)} · ${shortDate(row.createdAt)}`}
                isPublished={row.isPublished}
                href={row.imageUrl}
                labels={cardLabels}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
