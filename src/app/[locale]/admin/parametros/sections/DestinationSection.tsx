import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DataTable, StatusPill, type Column } from "@/components/admin/DataTable";
import { formatDate } from "@/core/format";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Costos de destino: lo que cuesta sacar el vehículo del puerto colombiano.
 *
 * Cada fila se calcula de una manera distinta —un valor fijo, un porcentaje del
 * CIF, una tarifa por día de almacenaje—, así que la columna «Cálculo» no es
 * decorativa: sin ella, dos filas con el número 7 significan cosas
 * incomparables.
 *
 * La columna «Base impoconsumo» existe porque el perímetro exacto de esa base
 * está en consulta con la SIA. Es un parámetro y no un supuesto escondido en el
 * motor, y aquí se ve fila por fila cuál entra y cuál no.
 */

interface DestinationRow {
  id: string;
  code: string;
  label: string;
  category: string;
  method: string;
  currency: string;
  amount: number;
  rate: number | null;
  minimum: number | null;
  powertrain: string | null;
  inExciseBase: boolean;
  legalBasis: string | null;
  verifiedAt: Date | null;
  staleAfterDays: number;
}

const MS_PER_DAY = 86_400_000;

export async function DestinationSection({
  locale,
  setId,
}: {
  locale: Locale;
  setId: string;
}) {
  const t = await getTranslations("admin.parameters");
  const now = Date.now();

  const rows: DestinationRow[] = await prisma.destinationCostRule
    .findMany({
      where: { parameterSetId: setId },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        labelEs: true,
        labelEn: true,
        category: true,
        method: true,
        currency: true,
        amount: true,
        rate: true,
        minimum: true,
        powertrain: true,
        inExciseBase: true,
        legalBasis: true,
        verifiedAt: true,
        staleAfterDays: true,
      },
    })
    .then((found) =>
      found.map((row) => ({
        id: row.id,
        code: row.code,
        label: locale === "es" ? row.labelEs : row.labelEn,
        category: String(row.category).replace(/_/g, " "),
        method: String(row.method).replace(/_/g, " "),
        currency: String(row.currency),
        amount: Number(row.amount),
        rate: row.rate === null ? null : Number(row.rate),
        minimum: row.minimum === null ? null : Number(row.minimum),
        powertrain: row.powertrain === null ? null : String(row.powertrain),
        inExciseBase: row.inExciseBase,
        legalBasis: row.legalBasis,
        verifiedAt: row.verifiedAt,
        staleAfterDays: row.staleAfterDays,
      })),
    )
    .catch(() => []);

  const number = new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    maximumFractionDigits: 2,
  });

  const isStale = (r: DestinationRow) =>
    r.verifiedAt === null || (now - r.verifiedAt.getTime()) / MS_PER_DAY > r.staleAfterDays;

  /** Un porcentaje y un importe fijo no se leen igual, ni deben. */
  const valueOf = (r: DestinationRow) =>
    r.rate !== null
      ? percent.format(r.rate)
      : `${r.currency} ${number.format(r.amount)}`;

  const columns: readonly Column<DestinationRow>[] = [
    {
      key: "code",
      header: t("destination.columns.code"),
      numeric: true,
      render: (r) => <span className="text-xs text-text-muted">{r.code}</span>,
    },
    {
      key: "label",
      header: t("destination.columns.label"),
      render: (r) => <span className="text-text-primary">{r.label}</span>,
    },
    {
      key: "category",
      header: t("destination.columns.category"),
      render: (r) => <span className="text-xs whitespace-nowrap">{r.category}</span>,
    },
    {
      key: "method",
      header: t("destination.columns.method"),
      render: (r) => <span className="text-xs whitespace-nowrap">{r.method}</span>,
    },
    {
      key: "value",
      header: t("destination.columns.value"),
      align: "right",
      numeric: true,
      render: (r) => (
        <span className="whitespace-nowrap">
          <span className="font-medium text-text-primary">{valueOf(r)}</span>
          {r.minimum !== null && (
            <span className="block text-[0.6875rem] text-text-muted">
              mín. {number.format(r.minimum)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "scope",
      header: t("destination.columns.scope"),
      render: (r) => (
        <span className="text-xs text-text-muted">
          {r.powertrain ?? t("common.any")}
        </span>
      ),
    },
    {
      key: "excise",
      header: t("destination.columns.excise"),
      render: (r) =>
        r.inExciseBase ? (
          <StatusPill tone="warning">{t("destination.inExciseBase")}</StatusPill>
        ) : (
          <span className="text-xs text-text-muted">{t("destination.notInExciseBase")}</span>
        ),
    },
    {
      key: "source",
      header: t("destination.columns.source"),
      render: (r) => (
        <span className="flex items-start gap-2">
          <span className="max-w-[20rem] text-xs text-text-muted">
            {r.legalBasis ?? t("common.none")}
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
      emptyMessage={t("destination.empty")}
    />
  );
}
