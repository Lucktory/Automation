import { Money } from "@/core/money";
import type {
  LineItem,
  LiquidationInput,
  LiquidationResult,
  ProrationResult,
} from "@/modules/pricing";

/**
 * La instantánea de una cotización.
 *
 * Es lo que permite reimprimir el PDF idéntico dentro de dos años, cuando las
 * tarifas se hayan republicado veinte veces y alguna regla ya no exista. El
 * criterio de aceptación de M5 lo dice sin rodeos: «una cotización produce un
 * PDF que se reproduce idéntico una semana después».
 *
 * Tres decisiones sostienen eso:
 *
 * 1. **Se guarda la ENTRADA y la SALIDA.** La salida imprime el documento; la
 *    entrada permite auditar por qué dio esa cifra, y volver a correr el motor
 *    sobre ella para comprobar que sigue dando lo mismo. Guardar solo el
 *    resultado convierte la cotización en una afirmación sin pruebas.
 *
 * 2. **Se guardan las ETIQUETAS en los dos idiomas, ya resueltas.** No claves
 *    i18n: texto. El catálogo de mensajes cambia, y si el PDF de 2026 se
 *    reimprime con la redacción de 2028 deja de ser el documento que el cliente
 *    aceptó. La base legal citada por cada línea viaja por el mismo motivo: la
 *    regla que la produjo puede haberse borrado.
 *
 * 3. **El dinero viaja como `{minor, currency}`**, que es lo que `Money.toJSON`
 *    produce. Un `number` de JavaScript no puede representar 218.400.000 pesos
 *    y 37 centavos a la vez que 0,004 de GMF sin perder precisión en algún
 *    punto; un entero en unidades mínimas sí, siempre.
 *
 * Este archivo es DOMINIO PURO: no importa Prisma, ni Next, ni el catálogo de
 * mensajes. Recibe las etiquetas ya traducidas como dato.
 */

/**
 * Versión del formato.
 *
 * Se guarda con cada instantánea para que añadir un campo a `LineItem` no
 * rompa la lectura de las cotizaciones escritas antes del cambio. Sin esto, el
 * primer campo nuevo obliga a elegir entre migrar registros inmutables —que por
 * definición no se pueden tocar— o romper el histórico.
 */
export const SNAPSHOT_VERSION = 2;

/** Dinero serializado. Idéntico a lo que devuelve `Money.toJSON()`. */
export interface MoneyJson {
  minor: string;
  currency: "COP" | "USD" | "EUR";
}

export interface SnapshotLabels {
  es: string;
  en: string;
}

export interface SnapshotLineItem {
  code: string;
  block: string;
  label: SnapshotLabels;
  /** Nota que explica la base de cálculo. Ya traducida, en ambos idiomas. */
  note: SnapshotLabels | null;
  amountUsd: MoneyJson | null;
  amountCop: MoneyJson;
  baseKind: string | null;
  baseAmountCop: MoneyJson | null;
  rateApplied: number | null;
  legalBasis: string | null;
  appliedRuleId: string | null;
  status: string;
  warning: string | null;
  displayOrder: number;
  isSubtotal: boolean;
}

export interface SnapshotProration {
  method: string;
  rows: {
    reference: string;
    weight: number;
    share: number;
    allocated: MoneyJson;
    isResidueBearer: boolean;
  }[];
  total: MoneyJson;
  residue: MoneyJson;
}

export interface QuoteSnapshot {
  version: number;
  /** Instante de emisión, ISO-8601 con desfase. */
  issuedAt: string;
  /** Identidad exacta del conjunto de parámetros usado. */
  parameterSet: { id: string; version: number };
  /** La entrada completa del motor, para poder reauditar el cálculo. */
  input: LiquidationInput;
  result: {
    lineItems: SnapshotLineItem[];
    fobUsd: MoneyJson;
    cifUsd: MoneyJson;
    cifCop: MoneyJson;
    taxesCop: MoneyJson;
    destinationCop: MoneyJson;
    addOnsCop: MoneyJson;
    landedCostCop: MoneyJson;
    totalCop: MoneyJson;
    totalCopCeiling: MoneyJson | null;
    freightProration: SnapshotProration;
    taxableBaseProration: SnapshotProration;
    timeline: Record<string, number>;
    status: string;
    warnings: { code: string; level: string; message: string }[];
  };
  /** Datos del vehículo, desnormalizados: la ficha puede borrarse. */
  vehicle: {
    id: string | null;
    description: string;
    hsCode: string;
    powertrain: string;
    originCountry: string;
    modelYear: number;
    containerShare: number;
    /** Ficha técnica, congelada: el catálogo puede cambiarla mañana. v2. */
    rangeKm?: number | null;
    rangeStandard?: string | null;
    horsepowerHp?: number | null;
    seats?: number | null;
  };
}

/** Cómo traducir una línea. La capa de presentación la resuelve y la pasa. */
export type LineLabeller = (item: LineItem) => {
  label: SnapshotLabels;
  note: SnapshotLabels | null;
};

const money = (value: Money): MoneyJson => value.toJSON();
const moneyOrNull = (value: Money | null | undefined): MoneyJson | null =>
  value == null ? null : value.toJSON();

function prorationJson(proration: ProrationResult): SnapshotProration {
  return {
    method: proration.method,
    rows: proration.rows.map((row) => ({
      reference: row.reference,
      weight: row.weight,
      share: row.share,
      allocated: money(row.allocated),
      isResidueBearer: row.isResidueBearer,
    })),
    total: money(proration.total),
    residue: money(proration.residue),
  };
}

export interface BuildSnapshotArgs {
  input: LiquidationInput;
  result: LiquidationResult;
  parameterSet: { id: string; version: number };
  issuedAt: Date;
  label: LineLabeller;
  vehicle: QuoteSnapshot["vehicle"];
}

export function buildSnapshot({
  input,
  result,
  parameterSet,
  issuedAt,
  label,
  vehicle,
}: BuildSnapshotArgs): QuoteSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    issuedAt: issuedAt.toISOString(),
    parameterSet,
    input,
    result: {
      lineItems: result.lineItems.map((item) => {
        const text = label(item);
        return {
          code: item.code,
          block: item.block,
          label: text.label,
          note: text.note,
          amountUsd: moneyOrNull(item.amountUsd),
          amountCop: money(item.amountCop),
          baseKind: item.baseKind ?? null,
          baseAmountCop: moneyOrNull(item.baseAmountCop),
          rateApplied: item.rateApplied ?? null,
          legalBasis: item.legalBasis ?? null,
          appliedRuleId: item.appliedRuleId ?? null,
          status: item.status,
          warning: item.warning ?? null,
          displayOrder: item.displayOrder,
          isSubtotal: item.isSubtotal ?? false,
        };
      }),
      fobUsd: money(result.fobUsd),
      cifUsd: money(result.cifUsd),
      cifCop: money(result.cifCop),
      taxesCop: money(result.taxesCop),
      destinationCop: money(result.destinationCop),
      addOnsCop: money(result.addOnsCop),
      landedCostCop: money(result.landedCostCop),
      totalCop: money(result.totalCop),
      totalCopCeiling: moneyOrNull(result.totalCopCeiling),
      freightProration: prorationJson(result.freightProration),
      taxableBaseProration: prorationJson(result.taxableBaseProration),
      timeline: { ...result.timeline },
      status: result.status,
      warnings: result.warnings.map((w) => ({
        code: w.code,
        level: w.level,
        message: w.message,
      })),
    },
    vehicle,
  };
}

/**
 * Comprueba que las partes suman el todo.
 *
 * Se corre ANTES de escribir, no después. Una cotización cuyas líneas no suman
 * su propio total es un documento que no se puede defender delante del cliente,
 * y una vez enviada ya no se puede corregir. Más vale fallar al guardar.
 */
export function assertSnapshotBalances(snapshot: QuoteSnapshot): void {
  const cop = (value: MoneyJson) => Money.fromJSON(value);

  const sum = snapshot.result.lineItems
    .filter((item) => !item.isSubtotal)
    .reduce((acc, item) => acc.plus(cop(item.amountCop)), Money.zero("COP"));

  const total = cop(snapshot.result.totalCop);

  if (!sum.equals(total)) {
    throw new SnapshotImbalanceError(sum.toString(), total.toString());
  }
}

export class SnapshotImbalanceError extends Error {
  constructor(
    readonly sumOfLines: string,
    readonly storedTotal: string,
  ) {
    super(
      `Las líneas suman ${sumOfLines} pero el total dice ${storedTotal}. No se guarda una cotización descuadrada.`,
    );
    this.name = "SnapshotImbalanceError";
  }
}
