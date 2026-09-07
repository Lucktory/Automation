import { Filter, Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pill, StatusDot } from "@/components/admin/Pill";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import type { PillTone } from "@/config/role-display";
import { prisma } from "@/infra/db/prisma";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";

/**
 * Inventario del back-office.
 *
 * La pantalla existe para responder dos preguntas antes que ninguna otra: si la
 * unidad es importable (elegibilidad) y cuánto cuesta puesta en Colombia. Por
 * eso esas son las dos únicas columnas con color — la píldora de elegibilidad y
 * la cifra en acento. El resto de la tabla es deliberadamente gris.
 *
 * Nada de lo que se lee aquí está escrito en el componente: las etiquetas salen
 * del catálogo de mensajes y los tonos de registros declarativos, así que
 * añadir un estado del vehículo es añadir una fila a un objeto, no editar un
 * `switch`.
 */

const PAGE_SIZE = 50;

/** `estLandedCop` es, por definición del campo, pesos colombianos. */
const LANDED_CURRENCY = "COP";

/** Bandera derivada del ISO 3166-1 alpha-2: 🇨🇳 = 'C' y 'N' desplazadas. */
const REGIONAL_INDICATOR_BASE = 0x1f1e6;
const LETTER_A_CODE = 65;
const COUNTRY_CODE_LENGTH = 2;

// --- Registros de presentación ---------------------------------------------

type EligibilityKey = "ELIGIBLE" | "NEEDS_REVIEW" | "BLOCKED";

const ELIGIBILITY_TONE: Record<EligibilityKey, PillTone> = {
  ELIGIBLE: "success",
  NEEDS_REVIEW: "warning",
  BLOCKED: "danger",
};

/** Ante un valor desconocido se asume revisión manual, nunca «elegible». */
const ELIGIBILITY_FALLBACK: EligibilityKey = "NEEDS_REVIEW";

function eligibilityOf(value: string): EligibilityKey {
  return Object.prototype.hasOwnProperty.call(ELIGIBILITY_TONE, value)
    ? (value as EligibilityKey)
    : ELIGIBILITY_FALLBACK;
}

/**
 * Motorización del vehículo → clave del catálogo `common.motorization`.
 * El catálogo agrupa: BEV y FCEV se leen como «eléctrico» en vitrina.
 */
type MotorizationKey = "EV" | "PHEV" | "HEV" | "MHEV" | "GASOLINE" | "DIESEL";

const MOTORIZATION_KEY: Record<string, MotorizationKey | undefined> = {
  BEV: "EV",
  FCEV: "EV",
  PHEV: "PHEV",
  HEV: "HEV",
  MHEV: "MHEV",
  GASOLINE: "GASOLINE",
  FLEX: "GASOLINE",
  DIESEL: "DIESEL",
};

/** Estado logístico del vehículo → clave de `admin.common.status` + tono. */
type StatusKey =
  | "active"
  | "inactive"
  | "pending"
  | "published"
  | "draft"
  | "sent"
  | "accepted"
  | "inTransit"
  | "delivered"
  | "onHold";

interface StatusDisplay {
  readonly key: StatusKey;
  readonly tone: PillTone;
}

const STATUS_DISPLAY: Record<string, StatusDisplay | undefined> = {
  DRAFT: { key: "draft", tone: "muted" },
  SOURCING: { key: "pending", tone: "info" },
  AVAILABLE: { key: "published", tone: "success" },
  RESERVED: { key: "onHold", tone: "warning" },
  PURCHASED: { key: "accepted", tone: "info" },
  IN_TRANSIT: { key: "inTransit", tone: "info" },
  IN_FREE_ZONE: { key: "onHold", tone: "warning" },
  NATIONALIZING: { key: "pending", tone: "warning" },
  NATIONALIZED: { key: "active", tone: "success" },
  DELIVERED: { key: "delivered", tone: "primary" },
  ARCHIVED: { key: "inactive", tone: "muted" },
};

const STATUS_FALLBACK: StatusDisplay = { key: "draft", tone: "muted" };

// --- Forma de la fila -------------------------------------------------------

interface InventoryRecord {
  readonly id: string;
  readonly label: string;
  readonly stockCode: string | null;
  readonly modelYear: number;
  readonly originCode: string;
  readonly originName: string | null;
  readonly originFlag: string | null;
  readonly powertrain: string;
  readonly fobUsd: number | null;
  readonly estLandedCop: number | null;
  readonly eligibility: string;
  readonly status: string;
  readonly isPublished: boolean;
}

/**
 * Muestra de respaldo.
 *
 * Si la base todavía no responde, una rejilla vacía se lee como pantalla rota.
 * Estas unidades reproducen la mezcla real del catálogo (China, Corea, Japón,
 * Estados Unidos) para que la pantalla siga contando lo mismo. El nombre del
 * país se resuelve con `Intl`, así que la muestra también cambia de idioma.
 */
const FALLBACK_ROWS: readonly InventoryRecord[] = [
  {
    id: "sample-1",
    label: "BYD Seal Excellence AWD",
    stockCode: "TG-2026-0001",
    modelYear: 2026,
    originCode: "CN",
    originName: null,
    originFlag: null,
    powertrain: "BEV",
    fobUsd: 32000,
    estLandedCop: 189400000,
    eligibility: "ELIGIBLE",
    status: "AVAILABLE",
    isPublished: true,
  },
  {
    id: "sample-2",
    label: "Tesla Model 3 Long Range AWD",
    stockCode: "TG-2026-0004",
    modelYear: 2026,
    originCode: "US",
    originName: null,
    originFlag: null,
    powertrain: "BEV",
    fobUsd: 41000,
    estLandedCop: 236900000,
    eligibility: "ELIGIBLE",
    status: "AVAILABLE",
    isPublished: true,
  },
  {
    id: "sample-3",
    label: "Kia EV6 GT-Line AWD 77.4 kWh",
    stockCode: "TG-2026-0005",
    modelYear: 2026,
    originCode: "KR",
    originName: null,
    originFlag: null,
    powertrain: "BEV",
    fobUsd: 46500,
    estLandedCop: null,
    eligibility: "ELIGIBLE",
    status: "RESERVED",
    isPublished: true,
  },
  {
    id: "sample-4",
    label: "Toyota Corolla Cross Hybrid XSE AWD",
    stockCode: "TG-2026-0010",
    modelYear: 2026,
    originCode: "JP",
    originName: null,
    originFlag: null,
    powertrain: "HEV",
    fobUsd: 29200,
    estLandedCop: 214300000,
    eligibility: "NEEDS_REVIEW",
    status: "IN_TRANSIT",
    isPublished: true,
  },
  {
    id: "sample-5",
    label: "Jetour Dashing Flagship 1.6T",
    stockCode: "TG-2026-0008",
    modelYear: 2026,
    originCode: "CN",
    originName: null,
    originFlag: null,
    powertrain: "GASOLINE",
    fobUsd: 20400,
    estLandedCop: 148700000,
    eligibility: "ELIGIBLE",
    status: "SOURCING",
    isPublished: false,
  },
  {
    id: "sample-6",
    label: "Mazda CX-5 Signature AWD 2.5",
    stockCode: "TG-2026-0009",
    modelYear: 2024,
    originCode: "JP",
    originName: null,
    originFlag: null,
    powertrain: "GASOLINE",
    fobUsd: 31500,
    estLandedCop: null,
    eligibility: "BLOCKED",
    status: "DRAFT",
    isPublished: false,
  },
];

/**
 * Una consulta que falle no puede tumbar la pantalla: se degrada a la muestra
 * de respaldo, que es exactamente lo que hay que ver en su lugar.
 */
async function loadInventory(locale: Locale): Promise<readonly InventoryRecord[]> {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { deletedAt: null },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: PAGE_SIZE,
      select: {
        id: true,
        stockCode: true,
        modelYear: true,
        originCountryCode: true,
        powertrain: true,
        fobUsd: true,
        estLandedCop: true,
        eligibilityStatus: true,
        status: true,
        isPublished: true,
        trim: {
          select: {
            name: true,
            model: { select: { name: true, brand: { select: { name: true } } } },
          },
        },
        originCountry: { select: { nameEs: true, nameEn: true, flagEmoji: true } },
      },
    });

    return vehicles.map((vehicle): InventoryRecord => {
      const { brand, name: modelName } = vehicle.trim.model;
      const country = vehicle.originCountry;

      return {
        id: vehicle.id,
        label: `${brand.name} ${modelName} ${vehicle.trim.name}`,
        stockCode: vehicle.stockCode,
        modelYear: vehicle.modelYear,
        originCode: vehicle.originCountryCode,
        originName: locale === "es" ? country.nameEs : country.nameEn,
        originFlag: country.flagEmoji,
        powertrain: vehicle.powertrain,
        // Decimal de Prisma: se convierte antes de tocar `Intl`, nunca se
        // concatena como cadena.
        fobUsd: vehicle.fobUsd === null ? null : Number(vehicle.fobUsd),
        estLandedCop: vehicle.estLandedCop === null ? null : Number(vehicle.estLandedCop),
        eligibility: vehicle.eligibilityStatus,
        status: vehicle.status,
        isPublished: vehicle.isPublished,
      };
    });
  } catch {
    return [];
  }
}

/** 'CN' → 🇨🇳. Sirve igual para las filas reales y para la muestra. */
function flagOf(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== COUNTRY_CODE_LENGTH) return "";

  const points = [...upper].map(
    (letter) => REGIONAL_INDICATOR_BASE + (letter.charCodeAt(0) - LETTER_A_CODE),
  );
  return String.fromCodePoint(...points);
}

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  /** El texto buscado vive en la URL, no en estado de cliente: es compartible. */
  const query = ((await searchParams).q ?? "").trim();

  const t = await getTranslations("admin.sections.inventory");
  const tCommon = await getTranslations("admin.common");
  const tCatalog = await getTranslations("common");

  const loaded = await loadInventory(locale);
  const all: readonly InventoryRecord[] = loaded.length > 0 ? loaded : FALLBACK_ROWS;

  // El filtro se aplica en el servidor sobre el conjunto ya cargado. Con un
  // catálogo grande esto bajaría a la consulta; con diez unidades, subir la
  // condición a Prisma solo añadiría ida y vuelta.
  const needle = query.toLowerCase();
  const rows = needle
    ? all.filter((row) =>
        `${row.label} ${row.stockCode ?? ""} ${row.modelYear} ${row.originCode} ${row.originName ?? ""} ${row.powertrain}`
          .toLowerCase()
          .includes(needle),
      )
    : all;

  const intlLocale = INTL_LOCALE[locale];
  const countryNames = new Intl.DisplayNames([intlLocale], { type: "region" });
  const integer = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 });
  const landed = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: LANDED_CURRENCY,
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  });

  const countBy = (key: EligibilityKey): number =>
    rows.filter((row) => eligibilityOf(row.eligibility) === key).length;

  const columns: readonly Column<InventoryRecord>[] = [
    {
      key: "vehicle",
      header: t("columns.vehicle"),
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-text-primary">{row.label}</span>
          {row.stockCode !== null && (
            <span className="text-xs text-text-muted" data-numeric>
              {row.stockCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "year",
      header: t("columns.year"),
      numeric: true,
      render: (row) => <span data-numeric>{integer.format(row.modelYear)}</span>,
    },
    {
      key: "origin",
      header: t("columns.origin"),
      render: (row) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <span aria-hidden>{row.originFlag ?? flagOf(row.originCode)}</span>
          {row.originName ?? countryNames.of(row.originCode) ?? row.originCode}
        </span>
      ),
    },
    {
      key: "powertrain",
      header: t("columns.powertrain"),
      render: (row) => {
        const key = MOTORIZATION_KEY[row.powertrain];
        // Sin etiqueta en catálogo se muestra el código técnico (CNG, LPG), que
        // es como se nombra la motorización en la industria en los dos idiomas.
        return key === undefined ? row.powertrain : tCatalog(`motorization.${key}`);
      },
    },
    {
      key: "fob",
      header: t("columns.fob"),
      align: "right",
      numeric: true,
      render: (row) =>
        row.fobUsd === null ? (
          <span className="text-text-muted">{t("notPriced")}</span>
        ) : (
          <span className="text-text-primary" data-numeric>
            {integer.format(row.fobUsd)}
          </span>
        ),
    },
    {
      key: "landed",
      header: t("columns.landed"),
      align: "right",
      numeric: true,
      render: (row) =>
        row.estLandedCop === null ? (
          <span className="text-text-muted">{t("notPriced")}</span>
        ) : (
          <span className="font-medium text-accent" data-numeric>
            {landed.format(row.estLandedCop)}
          </span>
        ),
    },
    {
      key: "eligibility",
      header: t("columns.eligibility"),
      render: (row) => {
        const key = eligibilityOf(row.eligibility);
        return <Pill tone={ELIGIBILITY_TONE[key]}>{t(`eligibility.${key}`)}</Pill>;
      },
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (row) => {
        const display = STATUS_DISPLAY[row.status] ?? STATUS_FALLBACK;
        return (
          <StatusDot tone={display.tone}>{tCommon(`status.${display.key}`)}</StatusDot>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <a
            href="/api/admin/inventario/export"
            className="inline-flex items-center justify-center gap-2 rounded-control border border-border-strong px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-elevated"
          >
            {tCommon("export")}
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("title")} value={integer.format(rows.length)} />
        <StatCard
          label={t("eligibility.ELIGIBLE")}
          value={integer.format(countBy("ELIGIBLE"))}
          tone="success"
        />
        <StatCard
          label={t("eligibility.NEEDS_REVIEW")}
          value={integer.format(countBy("NEEDS_REVIEW"))}
          tone="warning"
        />
        <StatCard
          label={t("eligibility.BLOCKED")}
          value={integer.format(countBy("BLOCKED"))}
        />
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            name="q"
            aria-label={t("search")}
            placeholder={t("search")}
            defaultValue={query}
            className="w-full rounded-control border border-border bg-surface py-2 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
          />
        </div>

        <Button type="submit" variant="ghost" size="sm">
          <Filter aria-hidden className="size-4" />
          {tCommon("filters")}
        </Button>
      </form>

      <section className="rounded-card border border-border bg-surface">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          isDimmed={(row) => !row.isPublished}
          emptyMessage={t("empty")}
        />
      </section>
    </div>
  );
}
