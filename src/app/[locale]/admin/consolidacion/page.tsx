import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pill } from "@/components/admin/Pill";
import { StatCard } from "@/components/ui/StatCard";
import { ActionDialog } from "@/components/ui/ActionDialog";
import type { PillTone } from "@/config/role-display";
import { formatDate, formatMoney, formatPercent } from "@/core/format";
import { Money, type CurrencyCode } from "@/core/money";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Consolidación — contenedores en armado.
 *
 * La pantalla existe para vender UNA idea: el flete de un contenedor es el
 * mismo lleve dos coches o cuatro, así que cada unidad que entra abarata a
 * todas las demás. Por eso la ocupación es el único dato que lleva acento: la
 * barra de llenado es el argumento comercial, no un adorno.
 */

const FREIGHT_CURRENCY: CurrencyCode = "USD";
const PAGE_SIZE = 12;
/** Un contenedor sin plazas declaradas se asume de tres unidades. */
const DEFAULT_CAPACITY = 3;
const PERCENT = 100;

/**
 * Estados de un contenedor, en un solo registro: la clave es la del catálogo
 * común (`admin.common.status.*`) y el valor, el tono. El color significa algo
 * —gris se arma, ámbar espera cierre, azul ya zarpó— y añadir un estado es
 * añadir una fila aquí, no tocar la tabla.
 */
const STATUS_TONE = {
  draft: "muted",
  pending: "warning",
  inTransit: "info",
} as const satisfies Record<string, PillTone>;

type ContainerStatus = keyof typeof STATUS_TONE;

interface ContainerRow {
  id: string;
  code: string;
  vessel: string | null;
  route: string;
  unitsFilled: number;
  capacity: number;
  freightPerUnitUsd: number;
  etd: Date | null;
  status: ContainerStatus;
}

/**
 * Filas de muestra.
 *
 * Se usan SOLO mientras la base no tenga contenedores sembrados: una rejilla
 * vacía se lee como una pantalla rota, no como una pantalla sin datos. Las
 * cifras siguen la misma aritmética que la tabla real —coste del contenedor
 * repartido entre las unidades embarcadas— para que la moraleja de la última
 * línea se vea en los números: 3.300 con una unidad, 1.200 con tres.
 */
const SAMPLE_CONTAINERS: readonly ContainerRow[] = [
  {
    id: "sample-tghu",
    code: "TGHU-4412280",
    vessel: "MSC LUCIA / 2618E",
    route: "Shanghai → Buenaventura",
    unitsFilled: 2,
    capacity: 3,
    freightPerUnitUsd: 2075,
    etd: new Date(Date.UTC(2026, 8, 18, 12)),
    status: "pending",
  },
  {
    id: "sample-msku",
    code: "MSKU-7830195",
    vessel: "SEASPAN RAPTOR / 041W",
    route: "Los Angeles → Cartagena",
    unitsFilled: 1,
    capacity: 3,
    freightPerUnitUsd: 3300,
    etd: new Date(Date.UTC(2026, 9, 2, 12)),
    status: "draft",
  },
  {
    id: "sample-caiu",
    code: "CAIU-6620471",
    vessel: "CMA CGM ZEPHYR / 317S",
    route: "Jebel Ali → Cartagena",
    unitsFilled: 3,
    capacity: 3,
    freightPerUnitUsd: 1200,
    etd: new Date(Date.UTC(2026, 7, 28, 12)),
    status: "inTransit",
  },
];

/** Zarpado ⇒ en tránsito; lleno ⇒ pendiente de cierre; el resto, en armado. */
function statusOf(
  unitsFilled: number,
  capacity: number,
  etd: Date | null,
): ContainerStatus {
  if (etd !== null && etd.getTime() < Date.now()) return "inTransit";
  if (unitsFilled >= capacity) return "pending";
  return "draft";
}

/**
 * Lectura defensiva: si la consulta falla o el modelo todavía no tiene filas,
 * la pantalla cae en las de muestra en vez de reventar.
 */
async function loadContainers(): Promise<readonly ContainerRow[]> {
  try {
    const records = await prisma.consolidation.findMany({
      take: PAGE_SIZE,
      orderBy: [{ etd: "asc" }, { createdAt: "desc" }],
      include: {
        originPort: { select: { name: true } },
        destinationPort: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });

    return records.map((record): ContainerRow => {
      const capacity = record.maxVehicles > 0 ? record.maxVehicles : DEFAULT_CAPACITY;
      const unitsFilled = record._count.items;
      const total = Number(record.containerCostUsd) + Number(record.surchargesUsd);

      return {
        id: record.id,
        code: record.reference,
        vessel: record.vesselName ?? record.bookingRef,
        route: `${record.originPort.name} → ${record.destinationPort.name}`,
        unitsFilled,
        capacity,
        freightPerUnitUsd: total / Math.max(1, unitsFilled),
        etd: record.etd,
        status: statusOf(unitsFilled, capacity, record.etd),
      };
    });
  } catch {
    return [];
  }
}

/** Barra de ocupación. El acento marca lo ya colocado del contenedor. */
function FillBar({ ratio }: { ratio: number }) {
  const percent = Math.min(PERCENT, Math.max(0, ratio * PERCENT));

  return (
    <span
      aria-hidden
      className="block h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-surface-elevated"
    >
      <span
        className="block h-full rounded-full bg-accent"
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}

export default async function ConsolidationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations("admin.sections.consolidation");
  const d = await getTranslations("admin.dialog");
  const tc = await getTranslations("admin.common");

  const stored = await loadContainers();
  const rows: readonly ContainerRow[] = stored.length > 0 ? stored : SAMPLE_CONTAINERS;

  const filledTotal = rows.reduce((sum, row) => sum + row.unitsFilled, 0);
  const capacityTotal = rows.reduce((sum, row) => sum + row.capacity, 0);
  const freightTotal = rows.reduce(
    (sum, row) => sum + row.freightPerUnitUsd * row.unitsFilled,
    0,
  );
  const occupancy = capacityTotal > 0 ? filledTotal / capacityTotal : 0;
  const freightAverage = filledTotal > 0 ? freightTotal / filledTotal : 0;

  const money = (value: number) => formatMoney(Money.of(value, FREIGHT_CURRENCY), locale);
  const units = (filled: number, total: number) => `${filled}/${total}`;

  const columns: readonly Column<ContainerRow>[] = [
    {
      key: "container",
      header: t("columns.container"),
      render: (row) => (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium text-text-primary" data-numeric>
            {row.code}
          </span>
          {row.vessel !== null && (
            <span className="text-xs text-text-muted">{row.vessel}</span>
          )}
        </span>
      ),
    },
    {
      key: "route",
      header: t("columns.route"),
      render: (row) => <span className="whitespace-nowrap">{row.route}</span>,
    },
    {
      key: "units",
      header: t("columns.units"),
      align: "right",
      numeric: true,
      render: (row) => (
        <span className="text-text-primary">{units(row.unitsFilled, row.capacity)}</span>
      ),
    },
    {
      key: "fill",
      header: t("columns.fill"),
      render: (row) => (
        <span className="flex items-center gap-2">
          <FillBar ratio={row.unitsFilled / row.capacity} />
          <span className="w-12 text-xs text-text-secondary" data-numeric>
            {formatPercent(row.unitsFilled / row.capacity, locale, 0)}
          </span>
        </span>
      ),
    },
    {
      key: "freight",
      header: t("columns.freight"),
      align: "right",
      numeric: true,
      render: (row) => (
        <span className="whitespace-nowrap text-text-primary">
          {money(row.freightPerUnitUsd)}
        </span>
      ),
    },
    {
      key: "etd",
      header: t("columns.etd"),
      align: "right",
      numeric: true,
      render: (row) => (
        <span className="whitespace-nowrap">
          {row.etd === null ? "—" : formatDate(row.etd, locale, "short")}
        </span>
      ),
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (row) => (
        <Pill tone={STATUS_TONE[row.status]}>{tc(`status.${row.status}`)}</Pill>
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
            trigger={t("newContainer")}
            title={d("newContainer.title")}
            description={d("newContainer.description")}
            submitLabel={d("submit")}
            cancelLabel={d("cancel")}
            closeLabel={d("close")}
            confirmation={d("saved")}
            fields={[
              { name: "code", label: d("newContainer.code"), placeholder: "TGHU-4412280" },
              { name: "route", label: d("newContainer.route"), placeholder: "CNSHA → COBUN" },
              { name: "capacity", label: d("newContainer.capacity"), type: "number", defaultValue: "3" },
              { name: "etd", label: d("newContainer.etd"), type: "date" },
            ]}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("columns.units")} value={units(filledTotal, capacityTotal)} />
        <StatCard
          label={t("columns.fill")}
          value={formatPercent(occupancy, locale, 0)}
          tone="accent"
        />
        <StatCard label={t("columns.freight")} value={money(freightAverage)} />
      </div>

      <section className="rounded-card border border-border bg-surface">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          emptyMessage={t("empty")}
        />
        <p className="border-t border-border px-4 py-3 text-xs text-text-muted sm:px-5">
          {t("savings")}
        </p>
      </section>
    </div>
  );
}
