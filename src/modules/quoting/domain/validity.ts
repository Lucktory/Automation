import type { LiquidationInput } from "@/modules/pricing";

/**
 * Hasta cuándo vale una cotización.
 *
 * NO es un número fijo de días. La vigencia la manda el dato más volátil que
 * entró en el cálculo, y ése es el flete: la tarifa Asia–WCSA se multiplicó por
 * 2,5 en cinco meses de 2026. Una cotización no puede sobrevivir a la tarifa
 * con la que se calculó; si lo hace, la empresa queda obligada a un precio que
 * ya no puede comprar.
 *
 * De ahí la regla: la cotización vence cuando vence su tarifa de flete.
 *
 *   diasRestantes = staleAfterDays − quotedDaysAgo
 *
 * `staleAfterDays` sale de la fila de la tarifa (columna del mismo nombre) y
 * `quotedDaysAgo` de su `verifiedAt`. Ambos vienen ya en la entrada del motor,
 * así que esta función es pura y se prueba sin base de datos.
 *
 * Si la tarifa YA está vencida el resultado es cero días: la cotización nace
 * vencida, que es exactamente lo que hay que decirle al comercial antes de que
 * la envíe, en vez de regalarle una semana que no existe.
 */

const MS_PER_DAY = 86_400_000;

export interface QuoteValidity {
  validUntil: Date;
  /** Días hábiles de vigencia concedidos. Cero significa tarifa vencida. */
  days: number;
  /** Qué dato mandó. Hoy siempre el flete; mañana puede haber otro más corto. */
  drivenBy: "FREIGHT_RATE_STALENESS";
  /** La tarifa ya estaba vencida al emitir. */
  bornStale: boolean;
}

export function quoteValidity(input: LiquidationInput, issuedAt: Date): QuoteValidity {
  const staleAfter = input.freight.staleAfterDays;
  const quotedAgo = input.freight.quotedDaysAgo;

  // Sin datos de frescura no se inventa una vigencia larga: se concede cero y
  // se marca, porque no sabemos cuándo se verificó esa tarifa.
  const remaining =
    staleAfter === undefined || quotedAgo === undefined
      ? 0
      : Math.max(0, staleAfter - quotedAgo);

  return {
    validUntil: new Date(issuedAt.getTime() + remaining * MS_PER_DAY),
    days: remaining,
    drivenBy: "FREIGHT_RATE_STALENESS",
    bornStale: remaining === 0,
  };
}
