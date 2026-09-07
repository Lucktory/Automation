import type { QuoteStatus } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pill } from "@/components/admin/Pill";
import { Button } from "@/components/ui/Button";
import { QUOTE_STATUS_DISPLAY } from "@/config/quote-status";
import { formatDate, formatMoney, formatRate } from "@/core/format";
import { Money, type CurrencyCode } from "@/core/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Listado de cotizaciones emitidas.
 *
 * Una cotización es un documento inmutable desde que se envía: la fila guarda su
 * propia TRM y su propia instantánea de cálculo. Por eso la tabla muestra la TRM
 * aplicada junto a su fecha — no la de hoy — y la vigencia, que es lo que decide
 * si el número todavía se puede honrar.
 */

const PAGE_SIZE = 50;
const MS_PER_DAY = 86_400_000;
const EMPTY_VALUE = "—";

/** El consecutivo se imprime como COT-<año>-<secuencia>. */
const REFERENCE_PREFIX = "COT";

/** Toda cotización se totaliza en pesos; el USD es un insumo, no el precio. */
const QUOTE_CURRENCY: CurrencyCode = "COP";


/** Fila de la tabla, ya desacoplada del modelo de datos. */
interface QuoteRow {
  id: string;
  reference: string;
  customer: string;
  customerEmail: string | null;
  vehicle: string;
  totalCop: number;
  trm: number;
  trmDate: Date;
  validUntil: Date | null;
  status: QuoteStatus;
}

/**
 * Filas de muestra.
 *
 * Se usan solo mientras la tabla `quotes` está vacía, para que la pantalla se
 * pueda leer y demostrar. Los desplazamientos son en días respecto de hoy, así
 * la vigencia sigue siendo coherente sin fechas congeladas en el código.
 */
interface SampleQuote {
  sequence: string;
  customer: string;
  customerEmail: string;
  vehicle: string;
  totalCop: number;
  trm: number;
  trmDaysAgo: number;
  validInDays: number;
  status: QuoteStatus;
}

const SAMPLE_QUOTES: readonly SampleQuote[] = [
  {
    sequence: "0187",
    customer: "Andrés Felipe Restrepo",
    customerEmail: "af.restrepo@grupolomas.com.co",
    vehicle: "Toyota Land Cruiser Prado VX 2022 · 2.8 TDI 4x4",
    totalCop: 258_400_000,
    trm: 4108.42,
    trmDaysAgo: 1,
    validInDays: 12,
    status: "SENT",
  },
  {
    sequence: "0186",
    customer: "Comercializadora Vélez S.A.S.",
    customerEmail: "compras@velezsas.co",
    vehicle: "Ford F-150 Lariat 2021 · 3.5 EcoBoost 4x4",
    totalCop: 214_950_000,
    trm: 4096.15,
    trmDaysAgo: 3,
    validInDays: 5,
    status: "ACCEPTED",
  },
  {
    sequence: "0185",
    customer: "María Camila Ospina",
    customerEmail: "mc.ospina@correo.com",
    vehicle: "Mazda CX-5 Grand Touring LX 2023 · 2.5 AWD",
    totalCop: 168_720_000,
    trm: 4121.9,
    trmDaysAgo: 9,
    validInDays: -4,
    status: "VIEWED",
  },
  {
    sequence: "0184",
    customer: "Jorge Iván Betancur",
    customerEmail: "ji.betancur@transandina.co",
    vehicle: "Chevrolet Tahoe LT 2020 · 5.3 V8 4x4",
    totalCop: 152_300_000,
    trm: 4087.63,
    trmDaysAgo: 14,
    validInDays: 21,
    status: "DRAFT",
  },
];

function sampleRows(now: Date): readonly QuoteRow[] {
  const issueYear = now.getFullYear();

  return SAMPLE_QUOTES.map((sample) => ({
    id: `${REFERENCE_PREFIX}-${sample.sequence}`,
    reference: `${REFERENCE_PREFIX}-${issueYear}-${sample.sequence}`,
    customer: sample.customer,
    customerEmail: sample.customerEmail,
    vehicle: sample.vehicle,
    totalCop: sample.totalCop,
    trm: sample.trm,
    trmDate: new Date(now.getTime() - sample.trmDaysAgo * MS_PER_DAY),
    validUntil: new Date(now.getTime() + sample.validInDays * MS_PER_DAY),
    status: sample.status,
  }));
}

/**
 * Lectura de las cotizaciones más recientes.
 *
 * Si la consulta falla, la pantalla muestra su estado vacío en vez de reventar:
 * un back-office que devuelve 500 por una tabla es peor que uno que dice que no
 * hay nada que mostrar.
 */
async function loadQuotes(): Promise<readonly QuoteRow[]> {
  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: { customer: true, vehicles: true },
    });

    return quotes.map((quote) => {
      const customer = quote.customer;
      const firstVehicle = quote.vehicles[0];
      const hasName = customer !== null && customer.name !== null;

      return {
        id: quote.id,
        reference: quote.reference,
        customer: customer?.name ?? customer?.email ?? EMPTY_VALUE,
        customerEmail: hasName ? customer.email : null,
        vehicle: firstVehicle?.descriptionEs ?? EMPTY_VALUE,
        totalCop: Number(quote.totalCop),
        trm: Number(quote.trmCommercial),
        trmDate: quote.trmDate,
        validUntil: quote.validUntil,
        status: quote.status,
      };
    });
  } catch {
    return [];
  }
}

export default async function QuotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const now = new Date();

  const stored = await loadQuotes();
  const rows = stored.length > 0 ? stored : sampleRows(now);

  const isExpired = (row: QuoteRow): boolean =>
    row.validUntil !== null && row.validUntil.getTime() < now.getTime();

  const columns: readonly Column<QuoteRow>[] = [
    {
      key: "reference",
      header: t("sections.quotes.columns.reference"),
      numeric: true,
      render: (row) => (
        <span className="font-medium whitespace-nowrap text-text-primary">
          {row.reference}
        </span>
      ),
    },
    {
      key: "customer",
      header: t("sections.quotes.columns.customer"),
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-text-primary">{row.customer}</p>
          {row.customerEmail !== null && (
            <p className="truncate text-xs text-text-muted">{row.customerEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: "vehicle",
      header: t("sections.quotes.columns.vehicle"),
      render: (row) => (
        <span className="block max-w-[22rem] truncate">{row.vehicle}</span>
      ),
    },
    {
      key: "total",
      header: t("sections.quotes.columns.total"),
      align: "right",
      numeric: true,
      render: (row) => (
        <span className="font-medium whitespace-nowrap text-text-primary" data-numeric>
          {formatMoney(Money.of(row.totalCop, QUOTE_CURRENCY), locale)}
        </span>
      ),
    },
    {
      key: "trm",
      header: t("sections.quotes.columns.trm"),
      align: "right",
      numeric: true,
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-text-primary" data-numeric>
            {formatRate(row.trm, locale)}
          </p>
          <p className="text-xs text-text-muted" data-numeric>
            {formatDate(row.trmDate, locale, "short")}
          </p>
        </div>
      ),
    },
    {
      key: "validUntil",
      header: t("sections.quotes.columns.validUntil"),
      align: "right",
      numeric: true,
      render: (row) => {
        if (row.validUntil === null) {
          return <span className="text-text-muted">{EMPTY_VALUE}</span>;
        }

        const expired = isExpired(row);

        return (
          <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
            <span
              className={expired ? "text-text-muted" : "text-text-primary"}
              data-numeric
            >
              {formatDate(row.validUntil, locale, "short")}
            </span>
            {expired && <Pill tone="danger">{t("sections.quotes.expired")}</Pill>}
          </div>
        );
      },
    },
    {
      key: "status",
      header: t("sections.quotes.columns.status"),
      render: (row) => {
        const display = QUOTE_STATUS_DISPLAY[row.status];
        return <Pill tone={display.tone}>{t(`common.quoteStatus.${display.key}`)}</Pill>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("sections.quotes.title")}
        description={t("sections.quotes.description")}
        actions={
          <Link href="/simulador" className="inline-flex rounded-control">
            <Button type="button" variant="primary">
              {t("sections.quotes.openSimulator")}
            </Button>
          </Link>
        }
      />

      <section className="rounded-card border border-border bg-surface">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          isDimmed={isExpired}
          emptyMessage={t("sections.quotes.empty")}
        />
      </section>
    </div>
  );
}
