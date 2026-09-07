import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CarIllustration } from "@/components/ui/CarIllustration";
import { Flag } from "@/components/ui/Flag";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";
import { SortSelect } from "./SortSelect";

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
 * La vitrina.
 *
 * El precio que se muestra es el COSTO PUESTO EN COLOMBIA con placas, no el
 * precio en origen. Es la diferencia que define el producto: cualquiera publica
 * un precio de subasta, y el comprador descubre los tributos después.
 *
 * Filtros y orden se resuelven en el SERVIDOR, por `searchParams`. Así el
 * estado de la vitrina vive en la URL —se comparte y el botón atrás funciona— y
 * no hace falta traerse el catálogo entero al navegador para filtrarlo.
 *
 * Las OPCIONES de cada filtro salen de los datos, no de una lista escrita a
 * mano: si mañana entra una pickup coreana, su carrocería y su bandera aparecen
 * solas. Una lista fija acabaría ofreciendo filtros que no devuelven nada.
 */

interface Filters {
  marca?: string;
  motor?: string;
  carroceria?: string;
  origen?: string;
}

type SortKey = "relevant" | "priceAsc" | "priceDesc" | "newest";

const SORTS: readonly SortKey[] = ["relevant", "priceAsc", "priceDesc", "newest"];

const ORDER_BY: Record<SortKey, object[]> = {
  relevant: [{ featured: "desc" }, { estLandedCop: "asc" }],
  priceAsc: [{ estLandedCop: "asc" }],
  priceDesc: [{ estLandedCop: "desc" }],
  newest: [{ createdAt: "desc" }],
};

interface CatalogCard {
  id: string;
  slug: string;
  brand: string;
  model: string;
  trim: string;
  modelYear: number;
  powertrain: string;
  bodyType: string;
  originCountry: string;
  landedCop: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

/** Todo lo que necesita la barra de filtros, tomado del catálogo publicado. */
interface FacetData {
  brands: { id: string; name: string }[];
  powertrains: string[];
  bodyTypes: string[];
  origins: string[];
}

async function loadFacets(): Promise<FacetData> {
  try {
    const [brands, rows] = await Promise.all([
      prisma.brand.findMany({
        where: {
          active: true,
          models: { some: { trims: { some: { vehicles: { some: { isPublished: true } } } } } },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.vehicle.findMany({
        where: { isPublished: true },
        select: { powertrain: true, bodyType: true, originCountryCode: true },
      }),
    ]);

    const unique = (values: string[]) => [...new Set(values)].sort();

    return {
      brands,
      powertrains: unique(rows.map((r) => r.powertrain)),
      bodyTypes: unique(rows.map((r) => r.bodyType)),
      origins: unique(rows.map((r) => r.originCountryCode)),
    };
  } catch {
    return { brands: [], powertrains: [], bodyTypes: [], origins: [] };
  }
}

async function loadCatalog(filters: Filters, sort: SortKey): Promise<CatalogCard[]> {
  try {
    const rows = await prisma.vehicle.findMany({
      where: {
        isPublished: true,
        ...(filters.marca ? { brandId: filters.marca } : {}),
        ...(filters.motor ? { powertrain: filters.motor as never } : {}),
        ...(filters.carroceria ? { bodyType: filters.carroceria as never } : {}),
        ...(filters.origen ? { originCountryCode: filters.origen } : {}),
      },
      orderBy: ORDER_BY[sort] as never,
      take: 60,
      select: {
        id: true,
        slug: true,
        modelYear: true,
        powertrain: true,
        bodyType: true,
        originCountryCode: true,
        estLandedCop: true,
        trim: {
          select: {
            name: true,
            model: { select: { name: true, brand: { select: { name: true } } } },
          },
        },
        images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      brand: row.trim.model.brand.name,
      model: row.trim.model.name,
      trim: row.trim.name,
      modelYear: row.modelYear,
      powertrain: row.powertrain,
      bodyType: row.bodyType,
      originCountry: row.originCountryCode,
      landedCop: row.estLandedCop === null ? null : Number(row.estLandedCop),
      imageUrl: row.images[0]?.url ?? null,
      imageAlt: row.images[0]?.alt ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const sp = await searchParams;
  const t = await getTranslations("site");
  const common = await getTranslations("common");

  const filters: Filters = {
    ...(sp.marca ? { marca: sp.marca } : {}),
    ...(sp.motor ? { motor: sp.motor } : {}),
    ...(sp.carroceria ? { carroceria: sp.carroceria } : {}),
    ...(sp.origen ? { origen: sp.origen } : {}),
  };
  const sort: SortKey = SORTS.includes(sp.orden as SortKey)
    ? (sp.orden as SortKey)
    : "relevant";

  const [vehicles, facets] = await Promise.all([
    loadCatalog(filters, sort),
    loadFacets(),
  ]);

  const intl = locale === "es" ? "es-CO" : "en-US";
  const cop = (value: number) => new Intl.NumberFormat(intl).format(value);
  const regionNames = new Intl.DisplayNames([intl], { type: "region" });
  const motor = (value: string) =>
    common(`motorization.${value === "BEV" ? "EV" : value}`);

  /**
   * Un filtro es un ENLACE, no un control con estado: la vitrina filtrada es
   * compartible y el botón atrás funciona. El `Link` de next-intl recibe la
   * clave de ruta y la query aparte, así el segmento traducido lo sigue
   * decidiendo el enrutador (/en/catalog).
   */
  const hrefWith = (patch: Partial<Record<keyof Filters | "orden", string | null>>) => {
    const query: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) if (value) query[key] = value;
    if (sort !== "relevant") query.orden = sort;
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete query[key];
      else if (value !== undefined) query[key] = value;
    }
    return { pathname: "/catalogo" as const, query };
  };

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-5 sm:px-8">
        <header className="pt-10 pb-8">
          <h1 className="font-display text-[2.75rem] leading-none font-bold tracking-[-0.03em] text-text-primary">
            {t("catalog.title")}
          </h1>
          <p className="mt-3 text-[0.9375rem] text-text-secondary">
            {t("catalog.subtitle")}
          </p>
        </header>

        <div className="flex flex-col gap-8 pb-4 lg:flex-row lg:gap-10">
          {/* ── Filtros ───────────────────────────────────────────────────
              Un raíl, no una tarjeta: encerrarlos en una caja con el mismo
              borde y radio que las fichas los pone a competir con el producto. */}
          <aside className="w-full shrink-0 border-border lg:w-56 lg:border-r lg:pr-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[0.8125rem] font-medium text-text-primary">
                {t("catalog.filters.title")}
              </h2>
              <Link
                href={{ pathname: "/catalogo", query: {} }}
                className="text-xs text-primary hover:underline"
              >
                {t("catalog.filters.clear")}
              </Link>
            </div>

            <div className="mt-5 flex flex-col divide-y divide-border">
              <FilterGroup label={t("catalog.filters.brand")}>
                <Chip href={hrefWith({ marca: null })} active={!filters.marca}>
                  {t("catalog.filters.allF")}
                </Chip>
                {facets.brands.map((brand) => (
                  <Chip
                    key={brand.id}
                    href={hrefWith({ marca: brand.id })}
                    active={filters.marca === brand.id}
                  >
                    {brand.name}
                  </Chip>
                ))}
              </FilterGroup>

              <FilterGroup label={t("catalog.filters.powertrain")}>
                <Chip href={hrefWith({ motor: null })} active={!filters.motor}>
                  {t("catalog.filters.allF")}
                </Chip>
                {facets.powertrains.map((value) => (
                  <Chip
                    key={value}
                    href={hrefWith({ motor: value })}
                    active={filters.motor === value}
                  >
                    {motor(value)}
                  </Chip>
                ))}
              </FilterGroup>

              <FilterGroup label={t("catalog.filters.bodyType")}>
                <Chip href={hrefWith({ carroceria: null })} active={!filters.carroceria}>
                  {t("catalog.filters.allF")}
                </Chip>
                {facets.bodyTypes.map((value) => (
                  <Chip
                    key={value}
                    href={hrefWith({ carroceria: value })}
                    active={filters.carroceria === value}
                  >
                    {t(`catalog.bodyTypes.${value}`)}
                  </Chip>
                ))}
              </FilterGroup>

              <FilterGroup label={t("catalog.filters.origin")}>
                <Chip href={hrefWith({ origen: null })} active={!filters.origen}>
                  {t("catalog.filters.allM")}
                </Chip>
                {facets.origins.map((code) => (
                  <Chip
                    key={code}
                    href={hrefWith({ origen: code })}
                    active={filters.origen === code}
                  >
                    <Flag code={code} className="rounded-[1px]" />
                    {regionNames.of(code) ?? code}
                  </Chip>
                ))}
              </FilterGroup>
            </div>
          </aside>

          {/* ── Resultados ────────────────────────────────────────────── */}
          <section className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-text-muted" data-numeric>
                {t("catalog.resultCount", { count: vehicles.length })}
              </p>
              <SortSelect
                value={sort}
                label={t("catalog.sort.label")}
                options={SORTS.map((key) => ({ value: key, label: t(`catalog.sort.${key}`) }))}
              />
            </div>

            {vehicles.length === 0 ? (
              <p className="border-t border-border py-20 text-center text-sm text-text-muted">
                {t("catalog.empty")}
              </p>
            ) : (
              <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
                {vehicles.map((vehicle) => (
                  <li key={vehicle.id}>
                    <Link
                      href={{ pathname: "/catalogo/[slug]", params: { slug: vehicle.slug } }}
                      className="group block"
                    >
                      {/* Sin marco alrededor de la ficha: la foto y su texto,
                          sobre el fondo de la página. Un borde por producto es
                          justo lo que hace que una vitrina parezca plantilla. */}
                      <span className="relative block overflow-hidden rounded-control bg-plate">
                        <span className="absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-200 group-hover:scale-x-100" />
                        {vehicle.imageUrl ? (
                          <img
                            src={vehicle.imageUrl}
                            alt={vehicle.imageAlt ?? `${vehicle.brand} ${vehicle.model}`}
                            loading="lazy"
                            className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <CarIllustration
                            bodyType={vehicle.bodyType}
                            className="aspect-[16/10] w-full px-6 py-4"
                          />
                        )}
                      </span>

                      <span className="mt-4 flex items-center gap-2 text-[0.6875rem] text-text-muted">
                        <Flag code={vehicle.originCountry} className="rounded-[1px]" />
                        <span data-numeric>{vehicle.modelYear}</span>
                        <span aria-hidden>·</span>
                        <span>{motor(vehicle.powertrain)}</span>
                      </span>

                      {/* Marca tenue, modelo en peso: se escanea la marca y se
                          lee el modelo, que es como se mira un catálogo. */}
                      <h3 className="mt-1 text-[1.0625rem] leading-snug">
                        <span className="text-text-muted">{vehicle.brand}</span>{" "}
                        <span className="font-semibold text-text-primary group-hover:text-primary">
                          {vehicle.model}
                        </span>
                      </h3>
                      <p className="mt-0.5 text-[0.8125rem] text-text-muted">{vehicle.trim}</p>

                      <p className="mt-4 flex items-baseline gap-1.5">
                        {vehicle.landedCop === null ? (
                          <span className="text-sm text-text-secondary">
                            {t("catalog.notPriced")}
                          </span>
                        ) : (
                          <>
                            <span className="text-[0.8125rem] text-text-secondary">COP</span>
                            <span
                              className="font-display text-[1.375rem] leading-none font-bold tracking-[-0.01em] text-text-primary"
                              data-numeric
                            >
                              {cop(vehicle.landedCop)}
                            </span>
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-[0.8125rem] text-text-muted">
                        {t("catalog.landedLabel")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-5 first:pt-0">
      <p className="mb-3 text-[0.6875rem] tracking-[0.1em] text-text-muted uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** La píldora es la ÚNICA forma completamente redonda de la pantalla. */
function Chip({
  href,
  active,
  children,
}: {
  href: React.ComponentProps<typeof Link>["href"];
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full bg-text-primary px-3 py-1.5 text-[0.8125rem] font-medium text-bg"
          : "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[0.8125rem] text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
      }
    >
      {children}
    </Link>
  );
}
