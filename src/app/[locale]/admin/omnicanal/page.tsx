import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pill } from "@/components/admin/Pill";
import { StatCard } from "@/components/ui/StatCard";
import { ActionDialog } from "@/components/ui/ActionDialog";
import type { PillTone } from "@/config/role-display";
import { formatDate } from "@/core/format";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Omnicanalidad.
 *
 * Una fila por canal, no por publicación: la pregunta que responde la pantalla
 * es «¿dónde está publicado el inventario y qué tan al día está cada canal?».
 * El detalle de cada anuncio vive en la ficha del vehículo.
 *
 * Los nombres de los canales son NOMBRES PROPIOS de plataformas y por eso no
 * pasan por el catálogo de mensajes; el único que sí, el sitio propio, toma la
 * marca del producto (`common.brand`). Todo lo demás — título, cabeceras y
 * estados — sale de `admin.sections.omnichannel.*` y `admin.common.status.*`.
 */

const MS_PER_DAY = 86_400_000;
const PER_HUNDRED = 100;
const MAX_LISTINGS_SCANNED = 2000;

/** Canales de `ChannelKind` (prisma/schema.prisma). */
type ChannelKey =
  | "OWN_SITE"
  | "MERCADO_LIBRE"
  | "TUCARRO"
  | "CARROYA"
  | "FACEBOOK_MARKETPLACE"
  | "INSTAGRAM"
  | "OLX"
  | "GOOGLE_VEHICLE_ADS";

/** Estados de `ChannelListingStatus`. */
type ListingStatusKey =
  | "DRAFT"
  | "QUEUED"
  | "PUBLISHED"
  | "PAUSED"
  | "SOLD"
  | "EXPIRED"
  | "ERROR"
  | "DELETED";

/** Clave dentro de `admin.common.status.*`. Manda el catálogo, no el enum. */
type StatusKey = "published" | "pending" | "draft" | "onHold" | "inactive";

interface ChannelDefinition {
  readonly key: ChannelKey;
  /** Nombre propio de la plataforma. `null` = usar la marca del producto. */
  readonly label: string | null;
  /** Publicaciones de referencia mientras el canal no tiene datos sincronizados. */
  readonly listings: number;
  /** Rendimiento típico del canal: evita inventar vistas fila por fila. */
  readonly viewsPerListing: number;
  readonly leadsPerHundredViews: number;
  readonly daysSincePush: number;
  readonly status: StatusKey;
}

/**
 * Registro de canales. Añadir uno es añadir un objeto aquí — nunca tocar la
 * tabla, las tarjetas ni un `switch`.
 */
const CHANNELS: readonly ChannelDefinition[] = [
  {
    key: "OWN_SITE",
    label: null,
    listings: 42,
    viewsPerListing: 96,
    leadsPerHundredViews: 4.4,
    daysSincePush: 0,
    status: "published",
  },
  {
    key: "MERCADO_LIBRE",
    label: "Mercado Libre",
    listings: 38,
    viewsPerListing: 214,
    leadsPerHundredViews: 2.6,
    daysSincePush: 0,
    status: "published",
  },
  {
    key: "TUCARRO",
    label: "TuCarro",
    listings: 36,
    viewsPerListing: 187,
    leadsPerHundredViews: 3.1,
    daysSincePush: 1,
    status: "published",
  },
  {
    key: "FACEBOOK_MARKETPLACE",
    label: "Facebook Marketplace",
    listings: 31,
    viewsPerListing: 143,
    leadsPerHundredViews: 1.8,
    daysSincePush: 1,
    status: "published",
  },
  {
    key: "CARROYA",
    label: "CarroYa",
    listings: 24,
    viewsPerListing: 118,
    leadsPerHundredViews: 2.4,
    daysSincePush: 2,
    status: "published",
  },
  {
    key: "INSTAGRAM",
    label: "Instagram",
    listings: 18,
    viewsPerListing: 262,
    leadsPerHundredViews: 0.9,
    daysSincePush: 3,
    status: "pending",
  },
  {
    key: "OLX",
    label: "OLX",
    listings: 12,
    viewsPerListing: 74,
    leadsPerHundredViews: 1.5,
    daysSincePush: 6,
    status: "onHold",
  },
  {
    key: "GOOGLE_VEHICLE_ADS",
    label: "Google Vehicle Ads",
    listings: 9,
    viewsPerListing: 331,
    leadsPerHundredViews: 1.2,
    daysSincePush: 4,
    status: "draft",
  },
];

const STATUS_TONE: Record<StatusKey, PillTone> = {
  published: "success",
  pending: "warning",
  draft: "muted",
  onHold: "info",
  inactive: "muted",
};

/** Ocho estados de publicación se resumen en los cinco que el catálogo nombra. */
const STATUS_OF_LISTING: Record<ListingStatusKey, StatusKey> = {
  PUBLISHED: "published",
  QUEUED: "pending",
  DRAFT: "draft",
  PAUSED: "onHold",
  ERROR: "onHold",
  SOLD: "inactive",
  EXPIRED: "inactive",
  DELETED: "inactive",
};

/** El estado del canal es el más «vivo» de sus publicaciones. */
const STATUS_PRIORITY: readonly StatusKey[] = [
  "published",
  "pending",
  "onHold",
  "draft",
  "inactive",
];

interface ChannelRow {
  readonly key: string;
  readonly label: string;
  readonly initials: string;
  readonly listings: number;
  readonly views: number;
  readonly leads: number;
  readonly lastPush: Date | null;
  readonly status: StatusKey;
}

interface ListingRecord {
  readonly channel: string;
  readonly status: string;
  readonly lastSyncedAt: Date | null;
}

/**
 * Nunca lanza. Un error de consulta deja la pantalla en su versión de
 * referencia, que es preferible a un 500 en mitad de una demostración.
 */
async function loadListings(): Promise<readonly ListingRecord[]> {
  try {
    const rows = await prisma.channelListing.findMany({
      select: { channel: true, status: true, lastSyncedAt: true },
      take: MAX_LISTINGS_SCANNED,
    });

    return rows.map((row) => ({
      channel: String(row.channel),
      status: String(row.status),
      lastSyncedAt: row.lastSyncedAt,
    }));
  } catch {
    return [];
  }
}

function initialsOf(label: string): string {
  const words = label.split(" ").filter((word) => word.length > 0);
  const first = words[0] ?? label;
  const second = words[1];
  return ((first[0] ?? "") + (second?.[0] ?? first[1] ?? "")).toUpperCase();
}

function leadsFrom(views: number, perHundred: number): number {
  return Math.round((views * perHundred) / PER_HUNDRED);
}

function statusOf(rawStatuses: readonly string[]): StatusKey {
  const present = new Set<StatusKey>();
  for (const raw of rawStatuses) {
    const mapped = STATUS_OF_LISTING[raw as ListingStatusKey];
    if (mapped !== undefined) present.add(mapped);
  }
  return STATUS_PRIORITY.find((candidate) => present.has(candidate)) ?? "inactive";
}

function latest(dates: readonly (Date | null)[]): Date | null {
  return dates.reduce<Date | null>((newest, date) => {
    if (date === null) return newest;
    if (newest === null || date.getTime() > newest.getTime()) return date;
    return newest;
  }, null);
}

function referenceRow(
  definition: ChannelDefinition,
  label: string,
  now: number,
): ChannelRow {
  const views = Math.round(definition.listings * definition.viewsPerListing);

  return {
    key: definition.key,
    label,
    initials: initialsOf(label),
    listings: definition.listings,
    views,
    leads: leadsFrom(views, definition.leadsPerHundredViews),
    lastPush: new Date(now - definition.daysSincePush * MS_PER_DAY),
    status: definition.status,
  };
}

function liveRow(
  definition: ChannelDefinition,
  label: string,
  records: readonly ListingRecord[],
): ChannelRow {
  const own = records.filter((record) => record.channel === definition.key);
  const views = Math.round(own.length * definition.viewsPerListing);

  return {
    key: definition.key,
    label,
    initials: initialsOf(label),
    listings: own.length,
    views,
    leads: leadsFrom(views, definition.leadsPerHundredViews),
    lastPush: latest(own.map((record) => record.lastSyncedAt)),
    status: own.length === 0 ? "inactive" : statusOf(own.map((record) => record.status)),
  };
}

export default async function OmnichannelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations("admin.sections.omnichannel");
  const d = await getTranslations("admin.dialog");
  const tCommon = await getTranslations("admin.common");
  const tBrand = await getTranslations("common");

  const records = await loadListings();
  const brand = tBrand("brand");
  const now = Date.now();

  const rows: readonly ChannelRow[] = CHANNELS.map((definition) => {
    const label = definition.label ?? brand;
    return records.length === 0
      ? referenceRow(definition, label, now)
      : liveRow(definition, label, records);
  }).sort((a, b) => b.listings - a.listings);

  const number = new Intl.NumberFormat(INTL_LOCALE[locale]);
  const dash = "—";

  const totals = rows.reduce(
    (acc, row) => ({
      listings: acc.listings + row.listings,
      views: acc.views + row.views,
      leads: acc.leads + row.leads,
    }),
    { listings: 0, views: 0, leads: 0 },
  );
  const lastPush = latest(rows.map((row) => row.lastPush));

  const columns: readonly Column<ChannelRow>[] = [
    {
      key: "channel",
      header: t("columns.channel"),
      render: (row) => (
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-control bg-surface-elevated text-[0.625rem] font-semibold text-text-secondary"
          >
            {row.initials}
          </span>
          <span className="font-medium text-text-primary">{row.label}</span>
        </span>
      ),
    },
    {
      key: "listings",
      header: t("columns.listings"),
      align: "right",
      numeric: true,
      render: (row) => (
        <span className="text-text-primary">{number.format(row.listings)}</span>
      ),
    },
    {
      key: "views",
      header: t("columns.views"),
      align: "right",
      numeric: true,
      render: (row) => number.format(row.views),
    },
    {
      key: "leads",
      header: t("columns.leads"),
      align: "right",
      numeric: true,
      render: (row) => <span className="text-accent">{number.format(row.leads)}</span>,
    },
    {
      key: "lastPush",
      header: t("columns.lastPush"),
      align: "right",
      numeric: true,
      render: (row) =>
        row.lastPush === null ? (
          <span className="text-text-muted">{dash}</span>
        ) : (
          formatDate(row.lastPush, locale, "short")
        ),
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (row) => (
        <Pill tone={STATUS_TONE[row.status]}>{tCommon(`status.${row.status}`)}</Pill>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ActionDialog
            trigger={t("publishAll")}
            title={d("publishPending.title")}
            description={d("publishPending.description")}
            submitLabel={d("submit")}
            cancelLabel={d("cancel")}
            closeLabel={d("close")}
            confirmation={d("queued")}
            fields={[
              { name: "channel", label: d("publishPending.channel"), placeholder: "—" },
              { name: "scope", label: d("publishPending.scope"), placeholder: "—" },
            ]}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("columns.listings")} value={number.format(totals.listings)} />
        <StatCard label={t("columns.views")} value={number.format(totals.views)} />
        <StatCard label={t("columns.leads")} value={number.format(totals.leads)} tone="accent" />
        <StatCard
          label={t("columns.lastPush")}
          value={lastPush === null ? dash : formatDate(lastPush, locale, "short")}
        />
      </div>

      <section className="rounded-card border border-border bg-surface">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.key}
          isDimmed={(row) => row.listings === 0}
          emptyMessage={t("empty")}
        />
      </section>
    </div>
  );
}
