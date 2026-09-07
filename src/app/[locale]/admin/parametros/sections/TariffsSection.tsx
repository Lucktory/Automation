import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DataTable, StatusPill, type Column } from "@/components/admin/DataTable";
import { formatDate, formatRate } from "@/core/format";
import type { Locale } from "@/i18n/routing";
import type { TariffRuleRow } from "@/modules/parameters";

/**
 * Aranceles: arancel, IVA e impoconsumo por subpartida, origen y motorización.
 *
 * Es la única sección de parámetros que pasa por el módulo de dominio en vez de
 * consultar la base directamente, porque resolver una tarifa NO es leer una
 * fila: hay que ir de lo más específico a lo más general —este origen y esta
 * motorización, luego este origen, luego cualquiera— y esa cascada es lógica de
 * negocio con pruebas propias.
 *
 * La regla vencida se atenúa en vez de esconderse: una tarifa que dejó de regir
 * sigue explicando por qué una cotización vieja salió como salió.
 */

const MS_PER_DAY = 86_400_000;

export async function TariffsSection({
  locale,
  rules,
}: {
  locale: Locale;
  rules: readonly TariffRuleRow[];
}) {
  const t = await getTranslations("admin.parameters");
  const now = Date.now();

  const isExpired = (rule: TariffRuleRow) =>
    rule.validTo !== null && rule.validTo.getTime() < now;

  const isStale = (rule: TariffRuleRow) =>
    rule.verifiedAt === null ||
    (now - rule.verifiedAt.getTime()) / MS_PER_DAY > rule.staleAfterDays;

  const rate = (value: number) => formatRate(value * 100, locale, 1);

  const columns: readonly Column<TariffRuleRow>[] = [
    {
      key: "hsCode",
      header: t("tariffs.columns.hsCode"),
      numeric: true,
      render: (r) => <span className="text-text-primary">{r.hsCode}</span>,
    },
    {
      key: "origin",
      header: t("tariffs.columns.origin"),
      render: (r) => (
        <span className="whitespace-nowrap">
          {r.originCountryName ?? t("tariffs.anyOrigin")}
        </span>
      ),
    },
    {
      key: "powertrain",
      header: t("tariffs.columns.motorization"),
      render: (r) => (
        <span className="whitespace-nowrap">
          {r.powertrain === null ? t("tariffs.anyPowertrain") : r.powertrain}
        </span>
      ),
    },
    {
      key: "duty",
      header: t("tariffs.columns.duty"),
      align: "right",
      numeric: true,
      render: (r) => <span className="font-medium text-text-primary">{rate(r.dutyRate)}</span>,
    },
    {
      key: "vat",
      header: t("tariffs.columns.vat"),
      align: "right",
      numeric: true,
      render: (r) => <span className="text-text-primary">{rate(r.vatRate)}</span>,
    },
    {
      key: "excise",
      header: t("tariffs.columns.excise"),
      align: "right",
      numeric: true,
      render: (r) => <span className="text-text-primary">{rate(r.exciseRate)}</span>,
    },
    {
      key: "validFrom",
      header: t("tariffs.columns.validFrom"),
      numeric: true,
      render: (r) => (
        <span className="whitespace-nowrap">{formatDate(r.validFrom, locale, "short")}</span>
      ),
    },
    {
      key: "validTo",
      header: t("tariffs.columns.validTo"),
      numeric: true,
      render: (r) =>
        isExpired(r) ? (
          <StatusPill tone="muted">{t("tariffs.expired")}</StatusPill>
        ) : r.validTo ? (
          <span className="whitespace-nowrap">{formatDate(r.validTo, locale, "short")}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "source",
      header: t("tariffs.columns.source"),
      render: (r) => (
        <span className="flex items-start gap-2">
          <span className="max-w-[24rem] text-xs text-text-muted">
            {r.legalBasis}
            {r.verifiedAt && (
              <>
                {" · "}
                {t("tariffs.verifiedOn", { date: formatDate(r.verifiedAt, locale, "short") })}
              </>
            )}
          </span>
          {isStale(r) && (
            <AlertTriangle
              size={14}
              className="mt-0.5 shrink-0 text-warning"
              aria-label={t("tariffs.staleWarning")}
            />
          )}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rules}
      getRowKey={(r) => r.id}
      isDimmed={isExpired}
      emptyMessage={t("tariffs.empty")}
    />
  );
}
