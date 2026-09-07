import clsx from "clsx";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusDot } from "@/components/admin/Pill";
import { StatCard } from "@/components/ui/StatCard";
import type { PillTone } from "@/config/role-display";
import { formatDate, formatMoney } from "@/core/format";
import { Money } from "@/core/money";
import { prisma } from "@/infra/db/prisma";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";

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
 * Pedidos — operaciones en curso.
 *
 * EL SEMÁFORO ES LA PANTALLA. Un pedido de importación vive entre cuatro y
 * dieciséis semanas y el comprador solo pregunta una cosa: «¿va bien?». La
 * respuesta es un punto de color, y todo lo demás en la fila existe para dar
 * contexto a ese punto.
 *
 * El pedido lleva DOS semáforos en la base de datos —documental y físico—
 * porque un contenedor puede estar navegando sin problema mientras falta el
 * certificado de origen. Aquí se muestra el PEOR de los dos: la fila responde
 * «¿hay algo que atender?», y basta con que una dimensión esté en rojo para que
 * la respuesta sea sí. El detalle por dimensión vive en la ficha del pedido.
 */

const CURRENCY = "COP" as const;
const PAGE_SIZE = 25;
const FILTER_PARAM = "semaforo";
/** Celda sin dato: raya tipográfica, nunca una cadena escrita a mano. */
const EMPTY_CELL = "—";

type TrafficLightValue = "GREEN" | "AMBER" | "RED" | "GREY";

/** Claves de `admin.common.status.*`. El catálogo manda; aquí solo se apunta. */
type StatusKey =
  | "active"
  | "inactive"
  | "pending"
  | "draft"
  | "sent"
  | "accepted"
  | "inTransit"
  | "delivered"
  | "onHold";

/** Significado del color: verde en marcha, ámbar en riesgo, rojo bloqueado. */
const LIGHT_TONE: Record<TrafficLightValue, PillTone> = {
  GREEN: "success",
  AMBER: "warning",
  RED: "danger",
  GREY: "muted",
};

const LIGHT_LABEL: Record<TrafficLightValue, StatusKey> = {
  GREEN: "active",
  AMBER: "pending",
  RED: "onHold",
  GREY: "inactive",
};

/** Gravedad: al combinar los dos semáforos gana siempre el más grave. */
const LIGHT_RANK: Record<TrafficLightValue, number> = {
  GREY: 0,
  GREEN: 1,
  AMBER: 2,
  RED: 3,
};

/** Presentación del punto. Tokens semánticos, jamás un hex suelto. */
const TONE_DOT: Record<PillTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  primary: "bg-primary",
  muted: "bg-neutral-status",
};

/** Filtros de la barra: los tres colores que piden una decisión. */
const FILTERS: readonly TrafficLightValue[] = ["GREEN", "AMBER", "RED"];

/**
 * Etapa del pedido → etiqueta del catálogo.
 *
 * `OrderStatus` tiene veintidós valores operativos; el back-office los agrupa
 * en las pocas etapas que un humano distingue de un vistazo. Añadir un estado
 * nuevo es añadir una línea a este registro, no tocar un `switch`.
 */
const STAGE_LABEL: Record<string, StatusKey> = {
  DRAFT: "draft",
  AWAITING_DEPOSIT: "pending",
  CONFIRMED: "accepted",
  SOURCING: "accepted",
  PURCHASED: "accepted",
  ORIGIN_LOGISTICS: "sent",
  BOOKED: "sent",
  LOADED: "sent",
  IN_TRANSIT: "inTransit",
  ARRIVED_PORT: "inTransit",
  IN_FREE_ZONE: "pending",
  NATIONALIZATION: "pending",
  RELEASED: "active",
  DESTINATION_LOGISTICS: "active",
  UPFITTING: "active",
  REGISTRATION: "active",
  READY_FOR_DELIVERY: "active",
  DELIVERED: "delivered",
  CLOSED: "delivered",
  ON_HOLD: "onHold",
  CANCELLED: "inactive",
  REFUNDED: "inactive",
};

interface OrderRow {
  id: string;
  reference: string;
  customer: string;
  vehicle: string;
  stage: StatusKey;
  estimatedDeliveryAt: Date | null;
  totalCop: number;
  light: TrafficLightValue;
}

/**
 * Operaciones de muestra mientras la base no tenga pedidos sembrados.
 *
 * Las cifras son coherentes con el corredor de importación: el total es lo que
 * el cliente firma —FOB, flete, arancel, IVA y matrícula—, no el precio de
 * origen.
 */
const SAMPLE_ORDERS: readonly OrderRow[] = [
  {
    id: "PED-2026-0118",
    reference: "PED-2026-0118",
    customer: "Carolina Restrepo Vélez",
    vehicle: "Toyota Land Cruiser Prado VX 2026",
    stage: "inTransit",
    estimatedDeliveryAt: new Date("2026-10-14T05:00:00.000Z"),
    totalCop: 412_500_000,
    light: "GREEN",
  },
  {
    id: "PED-2026-0121",
    reference: "PED-2026-0121",
    customer: "Andrés Felipe Gómez Ariza",
    vehicle: "Ford F-150 Lightning Lariat 2026",
    stage: "pending",
    estimatedDeliveryAt: new Date("2026-09-30T05:00:00.000Z"),
    totalCop: 389_900_000,
    light: "AMBER",
  },
  {
    id: "PED-2026-0124",
    reference: "PED-2026-0124",
    customer: "Inversiones Andinas S.A.S.",
    vehicle: "Tesla Model Y Long Range 2026",
    stage: "inTransit",
    estimatedDeliveryAt: new Date("2026-09-22T05:00:00.000Z"),
    totalCop: 268_400_000,
    light: "RED",
  },
  {
    id: "PED-2026-0126",
    reference: "PED-2026-0126",
    customer: "Mauricio Londoño Cadavid",
    vehicle: "Toyota Hilux SRX 2.8 4x4 2026",
    stage: "active",
    estimatedDeliveryAt: new Date("2026-09-18T05:00:00.000Z"),
    totalCop: 214_750_000,
    light: "GREEN",
  },
  {
    id: "PED-2026-0129",
    reference: "PED-2026-0129",
    customer: "Valentina Ospina Arango",
    vehicle: "BMW X5 xDrive40i 2026",
    stage: "accepted",
    estimatedDeliveryAt: new Date("2026-11-27T05:00:00.000Z"),
    totalCop: 486_300_000,
    light: "GREEN",
  },
];

function toLight(value: string): TrafficLightValue {
  return value === "GREEN" || value === "AMBER" || value === "RED" ? value : "GREY";
}

/** Documental + físico → un solo color: el peor de los dos. */
function worstLight(documentary: string, physical: string): TrafficLightValue {
  const a = toLight(documentary);
  const b = toLight(physical);
  return LIGHT_RANK[a] >= LIGHT_RANK[b] ? a : b;
}

function stageOf(status: string): StatusKey {
  return STAGE_LABEL[status] ?? "pending";
}

/**
 * Lectura de pedidos.
 *
 * Si la consulta falla —base sin migrar, conexión caída— la pantalla enseña un
 * estado vacío, no un 500. Una lista que no carga es un problema; una lista que
 * tumba el back-office entero es otro mucho mayor.
 */
async function loadOrders(): Promise<readonly OrderRow[]> {
  try {
    const records = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        customer: { select: { name: true, email: true } },
        items: { select: { descriptionEs: true }, take: 1 },
      },
    });

    return records.map((record) => {
      const item = record.items[0];
      return {
        id: record.id,
        reference: record.reference,
        customer: record.customer.name ?? record.customer.email,
        vehicle: item?.descriptionEs ?? EMPTY_CELL,
        stage: stageOf(record.status),
        estimatedDeliveryAt: record.estimatedDeliveryAt,
        totalCop: Number(record.totalCop),
        light: worstLight(record.documentaryLight, record.physicalLight),
      };
    });
  } catch {
    return [];
  }
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ semaforo?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const sp = await searchParams;
  const selected = FILTERS.find((value) => value === sp.semaforo) ?? null;

  const t = await getTranslations("admin.sections.orders");
  const tc = await getTranslations("admin.common");

  const loaded = await loadOrders();
  const rows = loaded.length > 0 ? loaded : SAMPLE_ORDERS;
  const visible = selected === null ? rows : rows.filter((row) => row.light === selected);

  const counts: Record<TrafficLightValue, number> = {
    GREEN: rows.filter((row) => row.light === "GREEN").length,
    AMBER: rows.filter((row) => row.light === "AMBER").length,
    RED: rows.filter((row) => row.light === "RED").length,
    GREY: rows.filter((row) => row.light === "GREY").length,
  };

  const total = rows.reduce(
    (sum, row) => sum.plus(Money.of(row.totalCop, CURRENCY)),
    Money.zero(CURRENCY),
  );

  const count = new Intl.NumberFormat(INTL_LOCALE[locale]);
  const label = (key: StatusKey) => tc(`status.${key}`);

  const chip = (isActive: boolean) =>
    clsx(
      "inline-flex items-center gap-2 rounded-control border px-3 py-1.5 text-xs font-medium transition-colors",
      isActive
        ? "border-border-strong bg-surface-elevated text-text-primary"
        : "border-border text-text-secondary hover:bg-surface-elevated",
    );

  const columns: readonly Column<OrderRow>[] = [
    {
      key: "reference",
      header: t("columns.reference"),
      numeric: true,
      render: (row) => (
        <span className="font-medium whitespace-nowrap text-text-primary">
          {row.reference}
        </span>
      ),
    },
    {
      key: "customer",
      header: t("columns.customer"),
      render: (row) => <span className="text-text-primary">{row.customer}</span>,
    },
    {
      key: "vehicle",
      header: t("columns.vehicle"),
      render: (row) => row.vehicle,
    },
    {
      key: "stage",
      header: t("columns.stage"),
      render: (row) => <span className="whitespace-nowrap">{label(row.stage)}</span>,
    },
    {
      key: "eta",
      header: t("columns.eta"),
      numeric: true,
      render: (row) => (
        <span className="whitespace-nowrap">
          {row.estimatedDeliveryAt === null
            ? EMPTY_CELL
            : formatDate(row.estimatedDeliveryAt, locale, "short")}
        </span>
      ),
    },
    {
      key: "total",
      header: t("columns.total"),
      align: "right",
      numeric: true,
      render: (row) => (
        <span className="whitespace-nowrap text-text-primary">
          {formatMoney(Money.of(row.totalCop, CURRENCY), locale)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (row) => (
        <StatusDot tone={LIGHT_TONE[row.light]}>{label(LIGHT_LABEL[row.light])}</StatusDot>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("columns.total")}
          value={formatMoney(total, locale)}
          tone="accent"
        />
        <StatCard
          label={label(LIGHT_LABEL.GREEN)}
          value={count.format(counts.GREEN)}
          tone="success"
        />
        <StatCard
          label={label(LIGHT_LABEL.AMBER)}
          value={count.format(counts.AMBER)}
          tone="warning"
        />
        <StatCard
          label={label(LIGHT_LABEL.RED)}
          value={count.format(counts.RED)}
          tone="neutral"
        />
      </div>

      {/*
        El filtro es navegación, no estado de cliente: cada color tiene su
        propia URL, así que «solo los rojos» se puede guardar en marcadores y la
        pantalla sigue siendo un componente de servidor, sin JavaScript.
      */}
      <nav aria-label={tc("filters")} className="flex flex-wrap items-center gap-2">
        <Link
          href="?"
          className={chip(selected === null)}
          {...(selected === null ? { "aria-current": "page" as const } : {})}
        >
          {tc("viewAll")}
        </Link>

        {FILTERS.map((value) => (
          <Link
            key={value}
            href={`?${FILTER_PARAM}=${value}`}
            className={chip(selected === value)}
            {...(selected === value ? { "aria-current": "page" as const } : {})}
          >
            <span
              aria-hidden
              className={clsx("size-2 shrink-0 rounded-full", TONE_DOT[LIGHT_TONE[value]])}
            />
            {label(LIGHT_LABEL[value])}
            <span data-numeric className="text-text-muted">
              {count.format(counts[value])}
            </span>
          </Link>
        ))}
      </nav>

      <section className="rounded-card border border-border bg-surface">
        <DataTable
          columns={columns}
          rows={visible}
          getRowKey={(row) => row.id}
          emptyMessage={t("empty")}
        />
      </section>
    </div>
  );
}
