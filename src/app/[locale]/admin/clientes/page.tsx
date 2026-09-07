import type { LeadSource } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import clsx from "clsx";
import {
  ClientDirectory,
  type ActivityEntry,
  type ClientRow,
} from "@/components/admin/ClientDirectory";
import { PageHeader } from "@/components/admin/PageHeader";
import { QuerySelect } from "@/components/admin/QuerySelect";
import { TableSearch } from "@/components/admin/TableSearch";
import { ActionDialog } from "@/components/ui/ActionDialog";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import {
  LEAD_SOURCE_DISPLAY,
  LEAD_SOURCE_ORDER,
  LEAD_STATUS_STAGE,
  type ClientStage,
} from "@/config/lead-display";
import { stageOf } from "@/config/order-funnel";
import { Link } from "@/i18n/navigation";
import { formatCompactCop } from "@/core/format";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Cartera de clientes — el CRM ligero.
 *
 * Reúne a quien ya compró y a quien todavía está preguntando en una sola tabla,
 * porque en esta operación son la misma persona en dos momentos distintos: el
 * prospecto que cotiza el martes es el cliente que firma el jueves, y separarlos
 * en dos pantallas obliga a buscar en las dos.
 *
 * La fila es el `Lead` —el registro comercial—, no el `User`. Un comprador tiene
 * cuenta; un prospecto que escribió por WhatsApp, no. Partir del usuario dejaría
 * fuera a la mitad de la cartera, que es justamente la mitad a la que hay que
 * llamar hoy.
 *
 * El VALOR ACUMULADO sale de las tablas de dinero —cotizaciones y pedidos
 * reales— y nunca de un campo escrito a mano: una cifra de negocio que se
 * teclea deja de coincidir con la realidad el primer día.
 */

const MAX_ROWS = 50;

/** Cuánto silencio hace falta para dar a alguien por dormido. */
const DORMANT_DAYS = 45;
const DAY_MS = 86_400_000;

/** Cuántos hitos caben en la ficha lateral sin volverse un registro de auditoría. */
const ACTIVITY_LIMIT = 6;

type StageFilter = "all" | "clients" | "prospects";
const STAGE_FILTERS: readonly StageFilter[] = ["all", "clients", "prospects"];

/** Iniciales para el avatar: dos letras, de nombre y apellido. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

const CO_MOBILE = /^57(\d{3})(\d{3})(\d{4})$/;

/** `+573001234567` → `+57 300 123 4567`. Cualquier otro formato se respeta. */
function formatPhone(raw: string | null): string | null {
  if (!raw) return null;
  const match = CO_MOBILE.exec(raw.replace(/\D/g, ""));
  if (match === null) return raw;
  return `+57 ${match[1]} ${match[2]} ${match[3]}`;
}

export default async function ClientsPage({
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
  const query = (sp.q ?? "").trim();
  const stageFilter: StageFilter = STAGE_FILTERS.includes(sp.estado as StageFilter)
    ? (sp.estado as StageFilter)
    : "all";
  const sourceFilter = LEAD_SOURCE_ORDER.includes(sp.origen as LeadSource)
    ? (sp.origen as LeadSource)
    : "";

  const t = await getTranslations("admin.sections.clients");
  const d = await getTranslations("admin.dialog");
  // Las etapas del pedido viven en el catálogo del panel de control: es el mismo
  // vocabulario, y duplicarlo aquí llevaría a que «Nacionalización» se llamara
  // distinto en dos pantallas.
  const tFunnel = await getTranslations("admin.sections.dashboard.funnel");

  const now = Date.now();
  const intl = INTL_LOCALE[locale];
  const plain = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 });
  const longDate = new Intl.DateTimeFormat(intl, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const relative = new Intl.RelativeTimeFormat(intl, { numeric: "auto" });
  const sinceThen = (date: Date) =>
    relative.format(-Math.max(0, Math.round((now - date.getTime()) / DAY_MS)), "day");

  /**
   * Una sola consulta trae la cartera con su actividad colgando.
   *
   * Las cotizaciones y los pedidos vienen anidados en vez de en una segunda
   * pasada por fila: con cincuenta personas en pantalla, una consulta por fila
   * son cien viajes a la base para pintar una tabla.
   */
  const leads = await prisma.lead
    .findMany({
      where: {
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { email: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(sourceFilter ? { source: sourceFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        documentType: true,
        documentId: true,
        source: true,
        status: true,
        createdAt: true,
        quotes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            reference: true,
            status: true,
            totalCop: true,
            createdAt: true,
          },
        },
        user: {
          select: {
            quotesAsCustomer: {
              orderBy: { createdAt: "desc" },
              select: { id: true, reference: true, status: true, totalCop: true, createdAt: true },
            },
            orders: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                reference: true,
                status: true,
                totalCop: true,
                createdAt: true,
                // Con qué cotización nació. Sin esto, una cotización aceptada
                // que ya se convirtió en pedido se sumaría dos veces al valor
                // acumulado y la cartera saldría inflada.
                quoteId: true,
              },
            },
          },
        },
      },
    })
    .catch(() => []);

  const rows: ClientRow[] = leads.map((lead) => {
    const name = lead.name ?? lead.email ?? "—";

    // Una cotización puede colgar del prospecto o de su cuenta. Se unen por id
    // para no contar dos veces la misma cuando cuelga de ambos.
    const quotes = [...lead.quotes, ...(lead.user?.quotesAsCustomer ?? [])].filter(
      (quote, index, all) => all.findIndex((other) => other.id === quote.id) === index,
    );
    const orders = lead.user?.orders ?? [];

    // El valor acumulado son los PEDIDOS —dinero comprometido— más las
    // cotizaciones aceptadas que todavía NO se convirtieron en pedido.
    //
    // Las dos exclusiones importan. Sumar toda cotización enviada inflaría la
    // cartera con dinero que nadie aceptó; y sumar una cotización aceptada que
    // ya tiene pedido detrás contaría la misma venta dos veces, que es el error
    // más fácil de cometer aquí y el más difícil de ver en pantalla.
    const converted = new Set(
      orders.map((order) => order.quoteId).filter((id): id is string => id !== null),
    );
    const orderValue = orders.reduce((sum, order) => sum + Number(order.totalCop), 0);
    const acceptedValue = quotes
      .filter((quote) => quote.status === "ACCEPTED" && !converted.has(quote.id))
      .reduce((sum, quote) => sum + Number(quote.totalCop), 0);
    const value = orderValue + acceptedValue;

    const events: { at: Date; text: string; tone: ActivityEntry["tone"]; id: string }[] = [
      {
        id: `lead-${lead.id}`,
        at: lead.createdAt,
        tone: "neutral" as const,
        text: t("activity.leadCreated", {
          source: t(`sources.${LEAD_SOURCE_DISPLAY[lead.source].key}`),
        }),
      },
      ...quotes.map((quote) => ({
        id: `quote-${quote.id}`,
        at: quote.createdAt,
        tone: (quote.status === "ACCEPTED" ? "client" : "prospect") as ActivityEntry["tone"],
        text:
          quote.status === "ACCEPTED"
            ? t("activity.quoteAccepted", { reference: quote.reference })
            : quote.status === "VIEWED"
              ? t("activity.quoteViewed", { reference: quote.reference })
              : quote.status === "SENT"
                ? t("activity.quoteSent", { reference: quote.reference })
                : t("activity.quoteCreated", { reference: quote.reference }),
      })),
      ...orders.map((order) => {
        const stage = stageOf(order.status);
        return {
          id: `order-${order.id}`,
          at: order.createdAt,
          tone: "client" as ActivityEntry["tone"],
          text: stage
            ? t("activity.orderMoved", {
                reference: order.reference,
                stage: tFunnel(stage.key),
              })
            : t("activity.orderPlaced", { reference: order.reference }),
        };
      }),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());

    const lastAt = events[0]?.at ?? lead.createdAt;
    const dormant = now - lastAt.getTime() > DORMANT_DAYS * DAY_MS;

    const stage: ClientStage =
      orders.length > 0
        ? "client"
        : dormant && LEAD_STATUS_STAGE[lead.status] !== "client"
          ? "inactive"
          : LEAD_STATUS_STAGE[lead.status];

    const source = LEAD_SOURCE_DISPLAY[lead.source];

    return {
      id: lead.id,
      name,
      initials: initialsOf(name),
      city: lead.city,
      email: lead.email,
      phone: formatPhone(lead.phone),
      document:
        lead.documentType && lead.documentId ? `${lead.documentType} ${lead.documentId}` : null,
      sourceLabel: t(`sources.${source.key}`),
      sourceClassName: source.className,
      quotes: quotes.length,
      orders: orders.length,
      value: `COP $ ${plain.format(value)}`,
      valueCop: value,
      lastActivity: sinceThen(lastAt),
      stage,
      stageLabel: t(`stage.${stage}`),
      activity: events.slice(0, ACTIVITY_LIMIT).map<ActivityEntry>((event) => ({
        id: event.id,
        text: event.text,
        date: longDate.format(event.at),
        tone: event.tone,
      })),
    };
  });

  const visible =
    stageFilter === "all"
      ? rows
      : rows.filter((row) =>
          stageFilter === "clients" ? row.stage === "client" : row.stage !== "client",
        );

  // Las cuatro cifras describen la cartera COMPLETA, no lo filtrado: son el
  // estado del negocio, y cambiarlas al escribir en el buscador las volvería
  // inservibles como referencia.
  const clientCount = rows.filter((row) => row.stage === "client").length;
  const prospectCount = rows.filter((row) => row.stage === "prospect").length;
  const totalValue = rows.reduce((sum, row) => sum + row.valueCop, 0);
  const conversion = rows.length > 0 ? Math.round((clientCount / rows.length) * 100) : 0;

  const hrefWith = (patch: { estado?: string | null }) => {
    const q: Record<string, string> = {};
    if (query) q.q = query;
    if (sourceFilter) q.origen = sourceFilter;
    if (stageFilter !== "all") q.estado = stageFilter;
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete q[key];
      else if (value !== undefined) q[key] = value;
    }
    return { pathname: "/admin/clientes" as const, query: q };
  };

  const isFiltered = query !== "" || sourceFilter !== "" || stageFilter !== "all";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost">{t("actions.export")}</Button>
            <ActionDialog
              trigger={t("actions.create")}
              title={t("actions.create")}
              description={t("description")}
              submitLabel={d("submit")}
              cancelLabel={d("cancel")}
              closeLabel={d("close")}
              confirmation={d("saved")}
              fields={[
                { name: "name", label: t("columns.name"), placeholder: "Andrea Gómez" },
                { name: "email", label: t("columns.email"), placeholder: "andrea@correo.com" },
                { name: "phone", label: t("columns.phone"), placeholder: "+57 300 123 4567" },
                { name: "document", label: t("columns.document"), placeholder: "CC 1.020.345.678" },
              ]}
            />
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("stats.clients")} value={String(clientCount)} />
        <StatCard label={t("stats.prospects")} value={String(prospectCount)} />
        <StatCard
          label={t("stats.value")}
          value={formatCompactCop(totalValue, locale)}
          tone="accent"
        />
        <StatCard label={t("stats.conversion")} value={`${conversion} %`} />
      </section>

      {/* Barra de herramientas sin caja: encerrarla en una tarjeta con el mismo
          borde que la tabla la pondría a competir con los datos. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <TableSearch placeholder={t("search")} />

          <div className="flex gap-2" role="group" aria-label={t("columns.status")}>
            {STAGE_FILTERS.map((key) => {
              const active = stageFilter === key;
              return (
                <Link
                  key={key}
                  href={hrefWith({ estado: key === "all" ? null : key })}
                  aria-current={active ? "true" : undefined}
                  className={clsx(
                    "rounded-full border px-4 py-1.5 text-[0.8125rem] transition-colors",
                    active
                      ? "border-text-primary bg-text-primary font-medium text-bg"
                      : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
                  )}
                >
                  {t(`filters.${key}`)}
                </Link>
              );
            })}
          </div>
        </div>

        <QuerySelect
          param="origen"
          value={sourceFilter}
          label={t("filters.source")}
          options={[
            { value: "", label: t("filters.allSources") },
            ...LEAD_SOURCE_ORDER.map((source) => ({
              value: source,
              label: t(`sources.${LEAD_SOURCE_DISPLAY[source].key}`),
            })),
          ]}
        />
      </div>

      <section className="rounded-card border border-border bg-surface">
        <ClientDirectory
          rows={visible}
          labels={{
            columns: {
              name: t("columns.name"),
              email: t("columns.email"),
              phone: t("columns.phone"),
              document: t("columns.document"),
              source: t("columns.source"),
              quotes: t("columns.quotes"),
              orders: t("columns.orders"),
              value: t("columns.value"),
              lastActivity: t("columns.lastActivity"),
              status: t("columns.status"),
            },
            rowMenu: t("actions.rowMenu"),
            viewDetail: t("actions.viewDetail"),
            sendEmail: t("actions.sendEmail"),
            newQuote: t("actions.newQuote"),
            activity: t("panel.activity"),
            noActivity: t("panel.noActivity"),
            close: t("panel.close"),
            empty: rows.length === 0 ? t("empty") : t("emptyFiltered"),
          }}
        />

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-xs text-text-muted">
            {t("showing", { shown: visible.length, total: rows.length })}
          </p>
          {isFiltered && (
            <Link
              href={{ pathname: "/admin/clientes", query: {} }}
              className="text-xs text-primary hover:underline"
            >
              {t("clearFilters")}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
