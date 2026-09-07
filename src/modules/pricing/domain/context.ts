import { Money } from "@/core/money";
import type { CostStage } from "./stage";
import type {
  CostBlock,
  EngineWarning,
  LineItem,
  LiquidationInput,
  ProrationResult,
  ResolutionStatus,
  TaxBaseKind,
} from "./types";

const COP = "COP" as const;
const USD = "USD" as const;

/** Peso relativo de cada estado, para poder quedarnos con el peor. */
const STATUS_SEVERITY: Record<ResolutionStatus, number> = {
  VALOR: 0,
  VALOR_CON_ADVERTENCIA: 1,
  NO_COTIZABLE: 2,
};

/**
 * Estado acumulado de una liquidación.
 *
 * Las etapas leen de aquí y escriben aquí. El contexto es la única memoria del
 * cálculo, y `record()` es lo que deja el rastro: qué etapa produjo qué línea,
 * con qué base, con qué tasa y bajo qué norma. Ese rastro es el desglose del
 * PDF, no una copia de él.
 */
export class PricingContext {
  readonly lines: LineItem[] = [];
  readonly warnings: EngineWarning[] = [];

  private readonly byCode = new Map<string, LineItem>();
  private worstStatus: ResolutionStatus = "VALOR";

  freightProration: ProrationResult | null = null;
  taxableBaseProration: ProrationResult | null = null;

  /**
   * Flete que entra en el VALOR EN ADUANA, según el reparto de base gravable.
   * Puede diferir del flete cobrado: el comercial es una decisión de negocio,
   * el aduanero está reglado (Res. 1684 de 2014 CAN).
   */
  taxableFreightUsd: Money = Money.zero(USD);

  private constructor(readonly input: LiquidationInput) {}

  static create(input: LiquidationInput): PricingContext {
    // Una TRM inválida produce una cotización de casi cero con cara de firme.
    // Se comprueba aquí porque este es el único constructor del estado.
    const { trmFiscal, trmCommercial } = input.fx;
    for (const [name, rate] of [
      ["fiscal", trmFiscal],
      ["comercial", trmCommercial],
    ] as const) {
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new RangeError(
          `La TRM ${name} debe ser un número positivo; se recibió ${rate}.`,
        );
      }
    }
    return new PricingContext(input);
  }

  // -- conversión -----------------------------------------------------------

  /** USD → COP a la TRM FISCAL. Los tributos no usan la TRM del día. */
  toCop(usd: Money): Money {
    return usd.convertTo(COP, this.input.fx.trmFiscal);
  }

  usd(amount: number): Money {
    return Money.of(amount, USD);
  }

  cop(amount: number): Money {
    return Money.of(amount, COP);
  }

  zeroUsd(): Money {
    return Money.zero(USD);
  }

  zeroCop(): Money {
    return Money.zero(COP);
  }

  // -- escritura ------------------------------------------------------------

  record(stage: CostStage, lines: readonly LineItem[]): void {
    for (const line of lines) {
      if (this.byCode.has(line.code)) {
        throw new Error(
          `La etapa "${stage.code}" emitió el código de línea duplicado "${line.code}".`,
        );
      }
      this.byCode.set(line.code, line);
      this.lines.push(line);
      if (STATUS_SEVERITY[line.status] > STATUS_SEVERITY[this.worstStatus]) {
        this.worstStatus = line.status;
      }
    }
  }

  warn(warning: EngineWarning): void {
    this.warnings.push(warning);
    if (warning.level === "BLOCK") this.worstStatus = "NO_COTIZABLE";
    else if (this.worstStatus === "VALOR") this.worstStatus = "VALOR_CON_ADVERTENCIA";
  }

  get status(): ResolutionStatus {
    return this.worstStatus;
  }

  // -- lectura --------------------------------------------------------------

  has(code: string): boolean {
    return this.byCode.has(code);
  }

  /** Importe en COP de una línea ya calculada. Cero si no existe. */
  amountCop(code: string): Money {
    return this.byCode.get(code)?.amountCop ?? this.zeroCop();
  }

  amountUsd(code: string): Money {
    return this.byCode.get(code)?.amountUsd ?? this.zeroUsd();
  }

  /** Suma en COP de un bloque. Los subtotales (FOB, CIF) quedan fuera. */
  blockTotalCop(block: CostBlock): Money {
    return Money.sum(
      this.lines
        .filter((l) => l.block === block && !l.isSubtotal)
        .map((l) => l.amountCop),
      COP,
    );
  }

  /** Suma en USD de un bloque. Los subtotales quedan fuera. */
  blockTotalUsd(block: CostBlock): Money {
    return Money.sum(
      this.lines
        .filter((l) => l.block === block && !l.isSubtotal && l.amountUsd !== null)
        .map((l) => l.amountUsd as Money),
      USD,
    );
  }

  sumCop(codes: readonly string[]): Money {
    return Money.sum(
      codes.map((c) => this.amountCop(c)),
      COP,
    );
  }

  sumUsd(codes: readonly string[]): Money {
    return Money.sum(
      codes.map((c) => this.amountUsd(c)),
      USD,
    );
  }

  // -- bases gravables ------------------------------------------------------

  /**
   * Resuelve una base gravable en COP.
   *
   * Las tres bases son DISTINTAS y este método es el único lugar donde se
   * definen. El invariante que protege: ninguna expresión de base de
   * impoconsumo puede contener un término de IVA, y ninguna base de IVA puede
   * contener un término de impoconsumo.
   */
  base(kind: TaxBaseKind): Money {
    switch (kind) {
      case "FOB":
        return this.toCop(this.amountUsd("FREIGHT.FOB"));

      // Base del arancel. Dto 1165/2019 art. 16.
      case "CIF":
        return this.amountCop("FREIGHT.CIF");

      // Base del IVA en importación, y SOLO del IVA. ET art. 459.
      case "CIF_PLUS_ARANCEL":
        return this.amountCop("FREIGHT.CIF").plus(this.amountCop("TAX.ARANCEL"));

      // Base del impoconsumo. ET art. 512-3 par. 3: valor total del bien sin
      // incluir el IVA. Incluye el arancel y los gastos de nacionalización
      // marcados `inExciseBase` — cuyo perímetro exacto es un parámetro,
      // porque está en consulta con la SIA.
      //
      // Los accesorios de fábrica NO se suman aparte: ya están dentro del
      // precio de compra, y por tanto dentro del FOB y del CIF. Sumarlos otra
      // vez inflaba la base del impoconsumo con un valor que no aparecía en
      // ninguna otra línea ni en el total.
      case "TOTAL_VALUE_EXCL_IVA":
        return this.amountCop("FREIGHT.CIF")
          .plus(this.amountCop("TAX.ARANCEL"))
          .plus(this.exciseIncludedDestinationCosts());

      // Todo lo acumulado hasta ahora. Excluye subtotales: sumar FOB y CIF
      // aquí contaría el origen y el flete tres veces.
      case "LANDED":
        return Money.sum(
          this.lines.filter((l) => !l.isSubtotal).map((l) => l.amountCop),
          COP,
        );
    }
  }

  /** Costos de destino que el parámetro marca como parte de la base del INC. */
  private exciseIncludedDestinationCosts(): Money {
    const included = new Set(
      this.input.destination
        .filter((rule) => rule.inExciseBase)
        .map((rule) => `DESTINATION.${rule.code}`),
    );
    return Money.sum(
      this.lines.filter((l) => included.has(l.code)).map((l) => l.amountCop),
      COP,
    );
  }
}
