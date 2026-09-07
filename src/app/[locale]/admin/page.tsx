import type { OrderStatus, QuoteStatus } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderFunnel, type FunnelSegment } from "@/components/admin/OrderFunnel";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pill } from "@/components/admin/Pill";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ORDER_FUNNEL, stageOf } from "@/config/order-funnel";
import {
  QUOTE_STATUS_DISPLAY,
  QUOTE_STATUSES_IN_PLAY,
  QUOTE_STATUSES_OPEN,
} from "@/config/quote-status";
import { formatCompactCop } from "@/core/format";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Panel de control del back-office.
 *
 * Responde tres preguntas en cinco segundos: cuánto dinero hay en juego, qué se
 * está moviendo, y qué está roto. Nada más.
 *
 * Todas las cifras salen de consultas reales. Cada una va envuelta por separado
 * para que una tabla vacía o una consulta rota deje su tarjeta en cero en vez
 * de tumbar el panel entero: la primera pantalla que ve el cliente no puede ser
 * un error 500.
 */

/**
 * «Pedidos en curso» son los que están dentro del embudo pero todavía no han
 * llegado al final. Se deriva del registro del embudo en vez de repetir una
 * lista de estados aquí: así la cifra de la tarjeta y la suma de la barra no
 * pueden contradecirse cuando alguien añada un estado al enum.
 */
const IN_FLIGHT_STATUSES = ORDER_FUNNEL.slice(0, -1).flatMap((stage) => stage.statuses);

const STALE_DAYS = 21;
const EXPIRING_WINDOW_DAYS = 7;
const STUCK_DAYS = 7;
const RECENT_LIMIT = 5;
const DAY_MS = 86_400_000;

async function count(query: Promise<number>): Promise<number> {
  try {
    return await query;
  } catch {
    return 0;
  }
}

/** Un pedido que lleva más de `STUCK_DAYS` sin moverse de estado. */
interface StuckOrder {
  reference: string;
  status: OrderStatus;
  since: Date;
}

interface RecentQuote {
  id: string;
  reference: string;
  customer: string | null;
  vehicle: string | null;
  totalCop: number;
  status: QuoteStatus;
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_DAYS * DAY_MS);
  const stuckBefore = new Date(now.getTime() - STUCK_DAYS * DAY_MS);
  const expiringBefore = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS);

  const [
    quotesOpen,
    ordersInFlight,
    inventory,
    leads,
    staleRates,
    pipeline,
    recent,
    funnelRows,
    stuckOrders,
    expiringQuotes,
    activeSet,
  ] = await Promise.all([
    count(prisma.quote.count({ where: { status: { in: [...QUOTE_STATUSES_OPEN] } } })),
    count(
      prisma.order.count({
        where: { status: { in: [...IN_FLIGHT_STATUSES] } },
      }),
    ),
    count(prisma.vehicle.count({ where: { isPublished: true } })),
    count(prisma.lead.count({ where: { status: "NEW" } })),
    count(
      prisma.freightRate.count({
        where: { OR: [{ verifiedAt: null }, { verifiedAt: { lt: staleBefore } }] },
      }),
    ),
    prisma.quote
      .aggregate({ _sum: { totalCop: true }, where: { status: { in: [...QUOTE_STATUSES_IN_PLAY] } } })
      .then((r) => Number(r._sum.totalCop ?? 0))
      .catch(() => 0),
    prisma.quote
      .findMany({
        orderBy: { createdAt: "desc" },
        take: RECENT_LIMIT,
        select: {
          id: true,
          reference: true,
          totalCop: true,
          status: true,
          customer: { select: { name: true, email: true } },
          vehicles: { select: { descriptionEs: true }, take: 1 },
        },
      })
      .then((rows) =>
        rows.map<RecentQuote>((row) => ({
          id: row.id,
          reference: row.reference,
          customer: row.customer?.name ?? row.customer?.email ?? null,
          vehicle: row.vehicles[0]?.descriptionEs ?? null,
          totalCop: Number(row.totalCop),
          status: row.status,
        })),
      )
      .catch(() => [] as RecentQuote[]),
    prisma.order
      .groupBy({ by: ["status"], _count: true })
      .catch(() => [] as { status: string; _count: number }[]),
    // Un pedido «detenido» no es uno viejo: es uno que lleva demasiado tiempo
    // SIN CAMBIAR DE ESTADO. Por eso se mira la fecha del último evento y no
    // `updatedAt`, que en una fila recién insertada es siempre hoy.
    prisma.order
      .findMany({
        where: { status: { in: [...IN_FLIGHT_STATUSES] } },
        select: {
          reference: true,
          status: true,
          events: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        },
      })
      .then((rows) =>
        rows
          .map((row) => ({
            reference: row.reference,
            status: row.status,
            since: row.events[0]?.createdAt ?? null,
          }))
          .filter((row): row is StuckOrder => row.since !== null && row.since < stuckBefore)
          .sort((a, b) => a.since.getTime() - b.since.getTime()),
      )
      .catch(() => [] as StuckOrder[]),
    count(
      prisma.quote.count({
        where: {
          status: { in: [...QUOTE_STATUSES_IN_PLAY] },
          validUntil: { gte: now, lte: expiringBefore },
        },
      }),
    ),
    prisma.pricingParameterSet
      .findFirst({
        where: { status: "ACTIVE" },
        select: { version: true, publishedAt: true },
      })
      .catch(() => null),
  ]);

  const intl = INTL_LOCALE[locale];
  const money = (value: number) =>
    new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }).format(value);
  const longDate = (value: Date) =>
    new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", year: "numeric" }).format(value);

  /** Los 21 estados del pedido, colapsados en las 7 etapas del negocio. */
  const byStatus = new Map(funnelRows.map((row) => [row.status, row._count]));
  const segments: FunnelSegment[] = ORDER_FUNNEL.map((stage) => ({
    key: stage.key,
    label: t(`sections.dashboard.funnel.${stage.key}`),
    count: stage.statuses.reduce((sum, status) => sum + (byStatus.get(status) ?? 0), 0),
  }));

  /** Solo se listan las alertas que de verdad tienen algo que decir. */
  const alerts: { key: string; tone: string; text: string }[] = [];
  if (staleRates > 0) {
    alerts.push({
      key: "stale",
      tone: "bg-warning",
      text: t("sections.dashboard.alertStaleFreight", { count: staleRates, days: STALE_DAYS }),
    });
  }
  // Se nombra el peor pedido, no un conteo: «1 pedido detenido» obliga a ir a
  // buscar cuál, y el aviso existe para ahorrar justamente ese viaje.
  const worstStuck = stuckOrders[0];
  if (worstStuck) {
    const stage = stageOf(worstStuck.status);
    alerts.push({
      key: "stuck",
      tone: "bg-danger",
      text: t("sections.dashboard.alertStuckOrder", {
        reference: worstStuck.reference,
        stage: stage ? t(`sections.dashboard.funnel.${stage.key}`) : worstStuck.status,
        days: Math.floor((now.getTime() - worstStuck.since.getTime()) / DAY_MS),
        more: stuckOrders.length - 1,
      }),
    });
  }
  if (expiringQuotes > 0) {
    alerts.push({
      key: "expiring",
      tone: "bg-info",
      text: t("sections.dashboard.alertExpiring", { count: expiringQuotes }),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("sections.dashboard.title")}
        description={t("sections.dashboard.description")}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("sections.dashboard.stats.quotes")} value={String(quotesOpen)} />
        <StatCard
          label={t("sections.dashboard.stats.pipeline")}
          value={formatCompactCop(pipeline, locale)}
          tone="accent"
        />
        <StatCard label={t("sections.dashboard.stats.orders")} value={String(ordersInFlight)} />
        <StatCard label={t("sections.dashboard.stats.inventory")} value={String(inventory)} />
        <StatCard label={t("sections.dashboard.stats.leads")} value={String(leads)} />
        <StatCard
          label={t("sections.dashboard.stats.staleRates")}
          value={String(staleRates)}
          tone={staleRates > 0 ? "warning" : "success"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-card border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="mb-5 text-[0.6875rem] font-semibold tracking-[0.12em] text-text-muted uppercase">
            {t("sections.dashboard.funnel.title")}
          </h2>
          <OrderFunnel segments={segments} />
        </section>

        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="mb-4 text-[0.6875rem] font-semibold tracking-[0.12em] text-text-muted uppercase">
            {t("sections.dashboard.alerts")}
          </h2>

          {alerts.length === 0 ? (
            <p className="flex gap-2.5 text-[0.8125rem] text-text-secondary">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-success" />
              {t("sections.dashboard.alertNoAlerts")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {alerts.map((alert) => (
                <li key={alert.key} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${alert.tone}`}
                  />
                  <span className="text-[0.8125rem] leading-relaxed text-text-secondary">
                    {alert.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-card border border-border bg-surface">
        <div className="flex items-baseline justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-[0.6875rem] font-semibold tracking-[0.12em] text-text-muted uppercase">
            {t("sections.dashboard.recentQuotes")}
          </h2>
          <Link href="/admin/cotizaciones" className="text-xs text-primary hover:underline">
            {t("common.viewAll")}
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState title={t("sections.quotes.empty")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {(["reference", "customer", "vehicle"] as const).map((key) => (
                    <th
                      key={key}
                      scope="col"
                      className="px-5 py-2.5 text-left text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase"
                    >
                      {t(`sections.dashboard.quoteColumns.${key}`)}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-5 py-2.5 text-right text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase"
                  >
                    {t("sections.dashboard.quoteColumns.total")}
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-2.5 text-left text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase"
                  >
                    {t("sections.dashboard.quoteColumns.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-elevated"
                  >
                    <td className="px-5 py-3 text-text-primary" data-numeric>
                      {quote.reference}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {quote.customer ?? (
                        <span className="text-text-muted">
                          {t("sections.dashboard.noCustomer")}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{quote.vehicle ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-text-primary" data-numeric>
                      {money(quote.totalCop)}
                    </td>
                    <td className="px-5 py-3">
                      <Pill tone={QUOTE_STATUS_DISPLAY[quote.status].tone}>
                        {t(`common.quoteStatus.${QUOTE_STATUS_DISPLAY[quote.status].key}`)}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Qué reglas rigen los cálculos ahora mismo. Sin esto, una cifra del
          panel no se puede reproducir: no se sabe con qué versión salió. */}
      {activeSet && (
        <Link
          href="/admin/parametros"
          className="flex items-center justify-between rounded-card border border-border bg-surface-elevated px-5 py-3.5 transition-colors hover:border-border-strong"
        >
          <span className="text-[0.8125rem] text-text-secondary">
            {t("sections.dashboard.parameterSet", {
              version: activeSet.version,
              date: activeSet.publishedAt ? longDate(activeSet.publishedAt) : "—",
            })}
          </span>
          <span className="flex items-center gap-1 text-xs text-primary">
            {t("sections.dashboard.viewParameters")}
            <ChevronRight size={13} aria-hidden />
          </span>
        </Link>
      )}
    </div>
  );
}
