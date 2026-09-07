import { getTranslations } from "next-intl/server";
import { DataTable, StatusPill, type Column } from "@/components/admin/DataTable";
import { INTL_LOCALE, type Locale } from "@/i18n/routing";
import { prisma } from "@/infra/db/prisma";

/**
 * Márgenes: la comisión de la plataforma y los costos financieros.
 *
 * La columna «Aplica sobre» es la que evita un error caro. La comisión de
 * pasarela se cobra SÓLO sobre el anticipo, porque ninguna pasarela colombiana
 * puede procesar un vehículo entero —PSE tope alrededor de COP 2,4 M—, y
 * calcularla sobre el precio completo inflaría el total con una cifra que nadie
 * va a pagar nunca.
 */

interface MarginRow {
  id: string;
  code: string;
  label: string;
  method: string;
  currency: string;
  rate: number | null;
  amount: number | null;
  depositOnly: boolean;
}

export async function MarginsSection({ locale, setId }: { locale: Locale; setId: string }) {
  const t = await getTranslations("admin.parameters");

  const rows: MarginRow[] = await prisma.marginRule
    .findMany({
      where: { parameterSetId: setId },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        labelEs: true,
        labelEn: true,
        method: true,
        currency: true,
        rate: true,
        amount: true,
        appliesToDepositOnly: true,
      },
    })
    .then((found) =>
      found.map((row) => ({
        id: row.id,
        code: row.code,
        label: locale === "es" ? row.labelEs : row.labelEn,
        method: String(row.method).replace(/_/g, " "),
        currency: String(row.currency),
        rate: row.rate === null ? null : Number(row.rate),
        amount: row.amount === null ? null : Number(row.amount),
        depositOnly: row.appliesToDepositOnly,
      })),
    )
    .catch(() => []);

  const number = new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    maximumFractionDigits: 2,
  });

  const columns: readonly Column<MarginRow>[] = [
    {
      key: "code",
      header: t("margins.columns.code"),
      numeric: true,
      render: (r) => <span className="text-xs text-text-muted">{r.code}</span>,
    },
    {
      key: "label",
      header: t("margins.columns.label"),
      render: (r) => <span className="text-text-primary">{r.label}</span>,
    },
    {
      key: "method",
      header: t("margins.columns.method"),
      render: (r) => <span className="text-xs whitespace-nowrap">{r.method}</span>,
    },
    {
      key: "value",
      header: t("margins.columns.value"),
      align: "right",
      numeric: true,
      render: (r) => (
        <span className="font-medium whitespace-nowrap text-text-primary">
          {r.rate !== null
            ? percent.format(r.rate)
            : r.amount !== null
              ? `${r.currency} ${number.format(r.amount)}`
              : t("common.none")}
        </span>
      ),
    },
    {
      key: "scope",
      header: t("margins.columns.scope"),
      render: (r) =>
        r.depositOnly ? (
          <StatusPill tone="warning">{t("margins.depositOnly")}</StatusPill>
        ) : (
          <span className="text-xs text-text-muted">{t("margins.fullPrice")}</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(r) => r.id}
      emptyMessage={t("margins.empty")}
    />
  );
}
