import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatRate } from "@/core/format";
import type { Locale } from "@/i18n/routing";
import type { ImpactResult } from "@/modules/parameters";

/**
 * "Simular impacto".
 *
 * Es lo que convierte una pantalla de tarifas en una sala de control: el
 * operador ve, antes de publicar, exactamente cuánto se mueve el precio de un
 * vehículo de ejemplo. Cambiar un número deja de ser un acto de fe.
 *
 * Aquí el color sí trabaja: sube en rojo, baja en verde, sin cambio en tenue.
 * Es la única parte con saturación de toda la pantalla.
 */
export function ImpactPanel({
  impact,
  locale,
}: {
  impact: ImpactResult | null;
  locale: Locale;
}) {
  const t = useTranslations("admin.parameters.impact");

  return (
    <section className="rounded-card border border-border bg-surface-elevated p-5">
      <h2 className="font-display text-base font-semibold text-text-primary">
        {t("title")}
      </h2>
      <p className="mt-1 text-xs text-text-muted">{t("description")}</p>

      {impact === null ? (
        <p className="mt-6 text-sm text-text-muted">{t("noDraft")}</p>
      ) : (
        <>
          <table className="mt-5 w-full text-sm" data-numeric>
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th scope="col" className="pb-2 text-left font-medium">
                  {t("concept")}
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  {t("before")}
                </th>
                <th scope="col" className="pb-2 text-right font-medium text-primary">
                  {t("after")}
                </th>
              </tr>
            </thead>
            <tbody>
              {impact.rows
                .filter((row) => row.beforeCop !== 0 || row.afterCop !== 0)
                .map((row) => {
                  const changed = row.deltaCop !== 0;
                  const up = row.deltaCop > 0;
                  return (
                    <tr key={row.code} className="border-b border-border last:border-0">
                      <td className="py-2 text-left text-text-secondary">{row.code}</td>
                      <td className="py-2 text-right text-text-muted">
                        {formatRate(row.beforeCop, locale, 0)}
                      </td>
                      <td
                        className={clsx(
                          "py-2 text-right",
                          changed
                            ? up
                              ? "text-danger"
                              : "text-success"
                            : "text-text-muted",
                        )}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          {changed &&
                            (up ? (
                              <ArrowUp size={12} aria-hidden />
                            ) : (
                              <ArrowDown size={12} aria-hidden />
                            ))}
                          {formatRate(row.afterCop, locale, 0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs text-text-muted">{t("total")}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2" data-numeric>
              <span className="text-sm text-text-muted line-through">
                {formatRate(impact.totalBeforeCop, locale, 0)}
              </span>
              <span className="font-display text-lg font-semibold text-text-primary">
                {formatRate(impact.totalAfterCop, locale, 0)}
              </span>
              {impact.totalDeltaPct !== null && impact.totalDeltaPct !== 0 && (
                <span
                  className={clsx(
                    "text-sm font-medium",
                    impact.totalDeltaPct > 0 ? "text-danger" : "text-success",
                  )}
                >
                  ({impact.totalDeltaPct > 0 ? "+" : ""}
                  {formatRate(impact.totalDeltaPct, locale, 1)}%)
                </span>
              )}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
