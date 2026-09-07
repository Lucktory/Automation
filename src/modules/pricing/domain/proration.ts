import { Money } from "@/core/money";
import type {
  ConsolidationUnit,
  ProrationMethod,
  ProrationResult,
  ProrationRow,
  TaxableBaseProrationMethod,
} from "./types";

/**
 * Consolidación logística: repartir el costo de UN contenedor entre las
 * unidades que lo comparten.
 *
 * Toda la aritmética delicada vive en `Money.allocate`, que garantiza que las
 * partes sumen EXACTAMENTE el total. Aquí solo se decide el peso de cada
 * unidad según el método.
 *
 * Dos métodos distintos a propósito:
 *  - el reparto COMERCIAL es libre (admite volumen);
 *  - el prorrateo de la BASE GRAVABLE solo admite valor FOB o peso, porque la
 *    Res. 1684 de 2014 CAN exige datos objetivos con documento soporte, y el
 *    volumen ocupado no consta ni en el B/L ni en la factura.
 */

/** Cero en unidades mínimas. Nombrado porque el dominio prohíbe literales. */
const ZERO_MINOR = 0n;

function weightsFor(
  units: readonly ConsolidationUnit[],
  method: ProrationMethod | TaxableBaseProrationMethod,
): number[] {
  switch (method) {
    case "EQUAL_SHARE":
      return units.map(() => 1);

    // El flete es parte del CIF, así que repartirlo POR CIF sería circular.
    // El criterio aduanero —y el no circular— es el valor FOB.
    case "BY_FOB_VALUE":
    case "BY_CIF_VALUE":
      return units.map((u) => u.fobUsd);

    case "BY_CBM":
      return units.map((u) => u.cbm);

    case "BY_WEIGHT":
      return units.map((u) => u.weightKg);

    case "MANUAL":
      return units.map((u) => u.manualShare ?? 0);
  }
}

export function prorate(
  total: Money,
  units: readonly ConsolidationUnit[],
  method: ProrationMethod | TaxableBaseProrationMethod,
): ProrationResult {
  if (units.length === 0) {
    throw new RangeError("La consolidación necesita al menos una unidad.");
  }

  if (method === "MANUAL") {
    const declared = units.reduce((acc, u) => acc + (u.manualShare ?? 0), 0);
    if (Math.abs(declared - 1) > Number.EPSILON * units.length) {
      throw new RangeError(
        `Las participaciones manuales deben sumar 1. Suman ${declared}.`,
      );
    }
  }

  const weights = weightsFor(units, method);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Pesos todos en cero significa que el dato que gobierna el reparto falta:
  // ningún vehículo tiene valor, o peso, o volumen. `Money.allocate` caería a
  // partes iguales, que para un reparto por valor es una respuesta inventada.
  // Se lanza en vez de repartir en silencio.
  if (totalWeight === 0) {
    throw new RangeError(
      `El prorrateo por ${method} necesita datos: todas las unidades tienen peso cero. ` +
        "No se reparte por partes iguales en silencio.",
    );
  }

  const allocated = total.allocate(weights);

  // El residuo es lo que la asignación por mayor resto tuvo que repartir por
  // encima del piso proporcional. Se muestra a propósito: es la prueba de que
  // la suma cuadra.
  let flooredMinor = ZERO_MINOR;
  const magnitude = total.minor < ZERO_MINOR ? -total.minor : total.minor;
  for (const weight of weights) {
    const exact = totalWeight === 0 ? 0 : Number(magnitude) * (weight / totalWeight);
    flooredMinor += BigInt(Math.floor(exact));
  }
  const residue = Money.fromMinor(magnitude - flooredMinor, total.currency);

  const rows: ProrationRow[] = units.map((unit, index) => {
    const part = allocated[index] as Money;
    const share = totalWeight === 0 ? 0 : (weights[index] as number) / totalWeight;
    const exactMinor =
      totalWeight === 0 ? 0 : Number(magnitude) * share;
    return {
      reference: unit.reference,
      weight: weights[index] as number,
      share,
      allocated: part,
      // Esta fila absorbió al menos una unidad mínima del residuo.
      isResidueBearer:
        Number(part.minor < ZERO_MINOR ? -part.minor : part.minor) >
        Math.floor(exactMinor),
    };
  });

  const checksum = Money.sum(
    rows.map((r) => r.allocated),
    total.currency,
  );
  if (!checksum.equals(total)) {
    // Inalcanzable si Money.allocate cumple su contrato. Se comprueba de todos
    // modos: un reparto que no cuadra invalida cada cifra de la cotización.
    throw new Error(
      `El prorrateo no cuadra: ${checksum.toString()} != ${total.toString()}`,
    );
  }

  return { method, rows, total, residue };
}
