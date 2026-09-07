import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { formatDate } from "@/core/format";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Fletes: la tarifa marítima por ruta.
 *
 * Es el dato más volátil del motor —Asia–WCSA se multiplicó por 2,5 en cinco
 * meses de 2026—, así que vence rápido a propósito y la fecha de verificación
 * es tan importante como la cifra. Una ruta sin verificar reciente lleva su
 * aviso ámbar aquí y no sólo en el panel de control: quien está mirando la
 * tarifa es quien puede arreglarla.
 */

interface FreightRow {
  id: string;
  route: string;
  mode: string;
  amountUsd: number;
  surcharges: number;
  transitMin: number;
  transitMax: number;
  perUnit: number;
  validFrom: Date;
  verifiedAt: Date | null;
  staleAfterDays: number;
  sourceRef: string | null;
}

const MS_PER_DAY = 86_400_000;

export async function FreightSection({
  locale,
  setId,
}: {
  locale: Locale;
  setId: string;
}) {
  const t = await getTranslations("admin.parameters");
  const now = Date.now();

  const rows: FreightRow[] = await prisma.freightRate
    .findMany({
      where: { parameterSetId: setId },
      orderBy: [{ originPort: { unlocode: "asc" } }],
      select: {
        id: true,
        mode: true,
        amountUsd: true,
        surcharges: true,
        transitDaysMin: true,
        transitDaysMax: true,
        vehiclesPerUnit: true,
        validFrom: true,
        verifiedAt: true,
        staleAfterDays: true,
        sourceRef: true,
        originPort: { select: { unlocode: true, name: true } },
        destinationPort: { select: { unlocode: true, name: true } },
      },
    })
    .then((found) =>
      found.map((row) => ({
        id: row.id,
        route: `${row.originPort.name} → ${row.destinationPort.name}`,
        mode: String(row.mode).replace(/_/g, " "),
        amountUsd: Number(row.amountUsd),
        surcharges: Number(row.surcharges),
        transitMin: row.transitDaysMin,
        transitMax: row.transitDaysMax,
        perUnit: row.vehiclesPerUnit ?? 1,
        validFrom: row.validFrom,
        verifiedAt: row.verifiedAt,
        staleAfterDays: row.staleAfterDays,
        sourceRef: row.sourceRef,
      })),
    )
    .catch(() => []);

  const usd = new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 0 });

  const isStale = (r: FreightRow) =>
    r.verifiedAt === null || (now - r.verifiedAt.getTime()) / MS_PER_DAY > r.staleAfterDays;

  const columns: readonly Column<FreightRow>[] = [
    {
      key: "route",
      header: t("freight.columns.route"),
      render: (r) => <span className="text-text-primary">{r.route}</span>,
    },
    {
      key: "mode",
      header: t("freight.columns.mode"),
      render: (r) => <span className="text-xs whitespace-nowrap">{r.mode}</span>,
    },
    {
      key: "amount",
      header: t("freight.columns.amount"),
      align: "right",
      numeric: true,
      render: (r) => (
        <span className="font-medium text-text-primary">{usd.format(r.amountUsd)}</span>
      ),
    },
    {
      key: "surcharges",
      header: t("freight.columns.surcharges"),
      align: "right",
      numeric: true,
      render: (r) => usd.format(r.surcharges),
    },
    {
      key: "transit",
      header: t("freight.columns.transit"),
      numeric: true,
      render: (r) => (
        <span className="whitespace-nowrap">
          {t("freight.days", { min: r.transitMin, max: r.transitMax })}
        </span>
      ),
    },
    {
      key: "perUnit",
      header: t("freight.columns.perUnit"),
      align: "right",
      numeric: true,
      render: (r) => r.perUnit,
    },
    {
      key: "validFrom",
      header: t("freight.columns.validFrom"),
      numeric: true,
      render: (r) => formatDate(r.validFrom, locale, "short"),
    },
    {
      key: "source",
      header: t("freight.columns.source"),
      render: (r) => (
        <span className="flex items-start gap-2">
          <span className="max-w-[20rem] text-xs text-text-muted">
            {r.sourceRef ?? t("common.none")}
            {r.verifiedAt && (
              <>
                {" · "}
                {t("common.verifiedOn", { date: formatDate(r.verifiedAt, locale, "short") })}
              </>
            )}
          </span>
          {isStale(r) && (
            <AlertTriangle
              size={14}
              className="mt-0.5 shrink-0 text-warning"
              aria-label={t("common.stale")}
            />
          )}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.id}
      emptyMessage={t("freight.empty")}
    />
  );
}
