/**
 * Errores del motor.
 *
 * Existen para que el fallo sea RUIDOSO. El bug más caro que este sistema puede
 * tener es un `catch` genérico que devuelva cero: produce una cotización que
 * parece correcta, por debajo del costo real, y alguien tiene que absorber la
 * diferencia. Por eso estos errores se lanzan y no se tragan.
 */

export class PricingError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * No existe regla arancelaria para la combinación pedida.
 * NUNCA se asume 0 %: la ausencia de regla no es una exención.
 */
export class TariffRuleNotFoundError extends PricingError {
  constructor(
    readonly hsCode: string,
    readonly originCountry: string,
    readonly powertrain: string,
    readonly on: string,
  ) {
    super(
      "TARIFF_RULE_NOT_FOUND",
      `No existe regla arancelaria para ${hsCode} · ${originCountry} · ${powertrain} en ${on}. No se asume arancel cero.`,
    );
  }
}

/** El parámetro existe pero lleva demasiado tiempo sin verificarse. */
export class ParameterStaleError extends PricingError {
  constructor(
    readonly parameter: string,
    readonly verifiedAt: string | null,
    readonly staleAfterDays: number,
  ) {
    super(
      "PARAMETER_STALE",
      `El parámetro ${parameter} no se verifica desde ${verifiedAt ?? "nunca"} y su vigencia es de ${staleAfterDays} días.`,
    );
  }
}

/** La unidad no puede importarse bajo el régimen solicitado. */
export class NotQuotableError extends PricingError {
  constructor(reason: string) {
    super("NOT_QUOTABLE", reason);
  }
}
