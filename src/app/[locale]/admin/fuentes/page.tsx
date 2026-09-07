import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pill } from "@/components/admin/Pill";
import { StatCard } from "@/components/ui/StatCard";
import { ActionDialog } from "@/components/ui/ActionDialog";
import type { PillTone } from "@/config/role-display";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";

/**
 * Fuentes de inventario.
 *
 * Una fila por origen (`Source`): subasta, mayorista o concesionario. El número
 * de anuncios sale de `RawListing`, y la última sincronización del `lastRunAt`
 * más reciente entre los `ScrapeJob` de esa fuente — la fuente en sí no guarda
 * esa marca, la guardan sus trabajos.
 *
 * La consulta va envuelta: si la base no responde, la pantalla cae al conjunto
 * de demostración en vez de reventar.
 */

/** Valores de `SourceType` en el esquema. Registro, no `switch`. */
const SOURCE_KINDS = ["AUCTION", "DEALER", "MARKETPLACE", "OEM", "BROKER", "MANUAL"] as const;
type SourceKind = (typeof SOURCE_KINDS)[number];

const STATUS_TONE: Record<"active" | "inactive", PillTone> = {
  active: "success",
  inactive: "muted",
};

const MAX_ROWS = 50;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

interface SourceRow {
  id: string;
  name: string;
  code: string;
  countryCode: string | null;
  kind: SourceKind;
  listings: number;
  lastSyncAt: Date | null;
  active: boolean;
}

function toKind(value: string): SourceKind {
  return SOURCE_KINDS.find((kind) => kind === value) ?? "MANUAL";
}

/**
 * Conjunto de demostración: canales reales de abastecimiento. Se usa solo
 * mientras la tabla `sources` no tenga filas, para que la pantalla se lea como
 * lo que va a ser y no como un error de carga.
 */
function sampleRows(now: number): readonly SourceRow[] {
  return [
    {
      id: "sample-copart",
      name: "Copart",
      code: "COPART_US",
      countryCode: "US",
      kind: "AUCTION",
      listings: 18_432,
      lastSyncAt: new Date(now - 42 * MINUTE_MS),
      active: true,
    },
    {
      id: "sample-iaai",
      name: "IAAI · Insurance Auto Auctions",
      code: "IAAI_US",
      countryCode: "US",
      kind: "AUCTION",
      listings: 12_907,
      lastSyncAt: new Date(now - 2 * HOUR_MS),
      active: true,
    },
    {
      id: "sample-manheim",
      name: "Manheim",
      code: "MANHEIM_US",
      countryCode: "US",
      kind: "AUCTION",
      listings: 9_615,
      lastSyncAt: new Date(now - 5 * HOUR_MS),
      active: true,
    },
    {
      id: "sample-che168",
      name: "Che168 Export",
      code: "CHE168_CN",
      countryCode: "CN",
      kind: "MARKETPLACE",
      listings: 6_240,
      lastSyncAt: new Date(now - 21 * HOUR_MS),
      active: true,
    },
    {
      id: "sample-alibaba-ev",
      name: "Alibaba EV Wholesale",
      code: "ALIBABA_EV_CN",
      countryCode: "CN",
      kind: "MARKETPLACE",
      listings: 3_118,
      lastSyncAt: new Date(now - 9 * DAY_MS),
      active: false,
    },
    {
      id: "sample-dxb",
      name: "Al-Futtaim Automall",
      code: "DEALER_DXB_01",
      countryCode: "AE",
      kind: "DEALER",
      listings: 1_472,
      lastSyncAt: null,
      active: true,
    },
  ];
}

async function loadSources(): Promise<readonly SourceRow[]> {
  try {
    const { prisma } = await import("@/infra/db/prisma");

    const records = await prisma.source.findMany({
      take: MAX_ROWS,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        countryCode: true,
        active: true,
        _count: { select: { rawListings: true } },
        jobs: {
          select: { lastRunAt: true },
          orderBy: { lastRunAt: "desc" },
          take: 1,
        },
      },
    });

    return records.map((record) => ({
      id: record.id,
      name: record.name,
      code: record.code,
      countryCode: record.countryCode,
      kind: toKind(record.type),
      listings: record._count.rawListings,
      lastSyncAt: record.jobs[0]?.lastRunAt ?? null,
      active: record.active,
    }));
  } catch {
    return [];
  }
}

/** Nombre del país en el idioma del usuario; nunca una lista de países a mano. */
function regionLabel(code: string | null, locale: Locale): string | null {
  if (code === null || !/^[A-Za-z]{2}$/.test(code)) return null;

  const upper = code.toUpperCase();
  try {
    return new Intl.DisplayNames([INTL_LOCALE[locale]], { type: "region" }).of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations("admin.sections.sources");
  const d = await getTranslations("admin.dialog");
  const tc = await getTranslations("admin.common");

  const stored = await loadSources();
  const rows = stored.length > 0 ? stored : sampleRows(Date.now());

  const number = new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 0 });
  const dateTime = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });

  const syncLabel = (date: Date | null): string =>
    date === null ? t("neverSynced") : dateTime.format(date);

  const totalListings = rows.reduce((sum, row) => sum + row.listings, 0);
  const activeCount = rows.filter((row) => row.active).length;
  const lastSync = rows.reduce<Date | null>(
    (latest, row) =>
      row.lastSyncAt !== null && (latest === null || row.lastSyncAt > latest)
        ? row.lastSyncAt
        : latest,
    null,
  );

  const columns: readonly Column<SourceRow>[] = [
    {
      key: "name",
      header: t("columns.name"),
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{row.name}</p>
          <p className="mt-0.5 truncate text-xs tracking-wide text-text-muted">{row.code}</p>
        </div>
      ),
    },
    {
      key: "country",
      header: t("columns.country"),
      render: (row) => {
        const label = regionLabel(row.countryCode, locale);
        if (label === null) return <span className="text-text-muted">—</span>;

        return (
          <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-text-secondary">{label}</span>
            <span className="text-xs text-text-muted" data-numeric>
              {row.countryCode?.toUpperCase()}
            </span>
          </span>
        );
      },
    },
    {
      key: "kind",
      header: t("columns.kind"),
      render: (row) => (
        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs tracking-wide whitespace-nowrap text-text-secondary">
          {row.kind}
        </span>
      ),
    },
    {
      key: "listings",
      header: t("columns.listings"),
      align: "right",
      numeric: true,
      render: (row) => (
        <span className={row.listings > 0 ? "text-text-primary" : "text-text-muted"}>
          {number.format(row.listings)}
        </span>
      ),
    },
    {
      key: "lastSync",
      header: t("columns.lastSync"),
      align: "right",
      numeric: true,
      render: (row) => (
        <span className={row.lastSyncAt === null ? "text-text-muted" : "text-text-secondary"}>
          {syncLabel(row.lastSyncAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (row) => (
        <Pill tone={row.active ? STATUS_TONE.active : STATUS_TONE.inactive}>
          {row.active ? tc("status.active") : tc("status.inactive")}
        </Pill>
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
            trigger={t("addSource")}
            title={d("newSource.title")}
            description={d("newSource.description")}
            submitLabel={d("submit")}
            cancelLabel={d("cancel")}
            closeLabel={d("close")}
            confirmation={d("saved")}
            fields={[
              { name: "name", label: d("newSource.name"), placeholder: "Copart" },
              { name: "country", label: d("newSource.country"), placeholder: "US" },
              { name: "kind", label: d("newSource.kind"), placeholder: "AUCTION" },
              { name: "url", label: d("newSource.url"), placeholder: "https://" },
            ]}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("columns.listings")}
          value={number.format(totalListings)}
          tone="accent"
        />
        <StatCard
          label={tc("status.active")}
          value={`${number.format(activeCount)} / ${number.format(rows.length)}`}
        />
        <StatCard label={t("columns.lastSync")} value={syncLabel(lastSync)} />
      </div>

      <section className="rounded-card border border-border bg-surface">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          isDimmed={(row) => !row.active}
          emptyMessage={t("empty")}
        />
      </section>
    </div>
  );
}
