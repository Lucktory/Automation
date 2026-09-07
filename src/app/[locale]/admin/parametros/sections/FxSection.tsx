import { getTranslations } from "next-intl/server";
import { DataTable, StatusPill, type Column } from "@/components/admin/DataTable";
import { formatDate } from "@/core/format";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Divisas: el histórico de la TRM.
 *
 * La tasa NO se guarda «la de hoy» sino con su rango de vigencia publicado por
 * la fuente, porque en Colombia la TRM del viernes rige sábado, domingo y lunes.
 * Una cotización emitida el domingo tiene que poder demostrar con qué tasa se
 * calculó, y esa demostración es esta tabla.
 *
 * El override manual se marca en pantalla: una tasa escrita a mano y una tasa
 * traída de la fuente oficial no valen lo mismo cuando alguien audita el precio.
 */

const ROWS = 20;

interface FxRow {
  id: string;
  pair: string;
  rate: number;
  validFrom: Date;
  validTo: Date;
  source: string;
  fetchedAt: Date;
  isOverride: boolean;
}

export async function FxSection({ locale }: { locale: Locale }) {
  const t = await getTranslations("admin.parameters");

  const rows: FxRow[] = await prisma.fxRate
    .findMany({
      orderBy: { validFrom: "desc" },
      take: ROWS,
      select: {
        id: true,
        base: true,
        quote: true,
        rate: true,
        validFrom: true,
        validTo: true,
        source: true,
        fetchedAt: true,
        overriddenById: true,
      },
    })
    .then((found) =>
      found.map((row) => ({
        id: row.id,
        pair: `${row.base}/${row.quote}`,
        rate: Number(row.rate),
        validFrom: row.validFrom,
        validTo: row.validTo,
        source: String(row.source),
        fetchedAt: row.fetchedAt,
        isOverride: row.overriddenById !== null,
      })),
    )
    .catch(() => []);

  const money = new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const columns: readonly Column<FxRow>[] = [
    {
      key: "pair",
      header: t("fx.columns.pair"),
      numeric: true,
      render: (r) => <span className="text-text-primary">{r.pair}</span>,
    },
    {
      key: "rate",
      header: t("fx.columns.rate"),
      align: "right",
      numeric: true,
      render: (r) => (
        <span className="font-medium text-text-primary">{money.format(r.rate)}</span>
      ),
    },
    {
      key: "validFrom",
      header: t("fx.columns.validFrom"),
      numeric: true,
      render: (r) => formatDate(r.validFrom, locale, "short"),
    },
    {
      key: "validTo",
      header: t("fx.columns.validTo"),
      numeric: true,
      render: (r) => formatDate(r.validTo, locale, "short"),
    },
    {
      key: "source",
      header: t("fx.columns.source"),
      render: (r) =>
        r.isOverride ? (
          <StatusPill tone="warning">{t("fx.override")}</StatusPill>
        ) : (
          <span className="text-xs text-text-muted">{r.source}</span>
        ),
    },
    {
      key: "fetchedAt",
      header: t("fx.columns.fetchedAt"),
      numeric: true,
      render: (r) => formatDate(r.fetchedAt, locale, "short"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.id}
      emptyMessage={t("fx.empty")}
    />
  );
}
