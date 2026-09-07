"use client";

import type { ProrationResult } from "@/modules/pricing";

/**
 * Reparto del contenedor.
 *
 * La fila de AJUSTE DE REDONDEO se muestra siempre y el residuo va absorbido en
 * la última unidad, así que las filas suman exactamente el total. Un residuo
 * flotando aparte, sin dueño, es justo el descuadre que esta tabla existe para
 * descartar: si las partes no suman el todo, ninguna cifra de la cotización
 * merece confianza.
 */
export function ProrationTable({
  proration,
  columns,
  residueLabel,
  totalLabel,
  note,
  formatUsd,
  formatPercent,
}: {
  proration: ProrationResult;
  columns: { index: string; vehicle: string; share: string; allocated: string };
  residueLabel: string;
  totalLabel: string;
  /** Nota al pie. Se omite cuando quien la usa ya la muestra en su encabezado. */
  note?: string;
  formatUsd: (value: number) => string;
  formatPercent: (value: number) => string;
}) {
  if (proration.rows.length === 0) return null;

  const total = proration.total.toNumber();
  const residue = proration.residue.toNumber();

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 px-3 py-1.5 text-left text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase">
                {columns.index}
              </th>
              <th className="px-3 py-1.5 text-left text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase">
                {columns.vehicle}
              </th>
              <th className="px-3 py-1.5 text-right text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase">
                {columns.share}
              </th>
              <th className="px-3 py-1.5 text-right text-[0.625rem] font-medium tracking-[0.1em] text-text-muted uppercase">
                {columns.allocated}
              </th>
            </tr>
          </thead>
          <tbody>
            {proration.rows.map((row, index) => (
              <tr key={row.reference} className="border-b border-border">
                <td className="px-3 py-1.5 text-text-muted" data-numeric>
                  {index + 1}
                </td>
                <td className="px-3 py-1.5 text-text-secondary">{row.reference}</td>
                <td className="px-3 py-1.5 text-right text-accent" data-numeric>
                  {formatPercent(row.share)}
                </td>
                <td className="px-3 py-1.5 text-right text-text-primary" data-numeric>
                  {formatUsd(row.allocated.toNumber())}
                </td>
              </tr>
            ))}

            <tr className="border-b border-border">
              <td className="px-3 py-1.5 text-text-muted">–</td>
              <td className="px-3 py-1.5 text-[0.6875rem] text-text-muted italic" colSpan={2}>
                {residueLabel}
              </td>
              <td className="px-3 py-1.5 text-right text-[0.6875rem] text-text-muted italic" data-numeric>
                {formatUsd(residue)}
              </td>
            </tr>

            <tr>
              <td className="px-3 py-1.5" />
              <td className="px-3 py-1.5 font-medium text-text-primary" colSpan={2}>
                {totalLabel}
              </td>
              <td
                className="px-3 py-1.5 text-right font-medium text-text-primary"
                data-numeric
              >
                {formatUsd(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {note && <p className="mt-2 px-3 text-xs text-text-muted">{note}</p>}
    </div>
  );
}
