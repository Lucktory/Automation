import type { PricingContext } from "./context";
import type { CostBlock, LineItem } from "./types";

/**
 * Una etapa de costo.
 *
 * El motor es un REGISTRO de etapas independientes, no una función larga con
 * veinte sumas dentro. Agregar un tributo o un recargo nuevo es escribir un
 * archivo y añadir una entrada al registro: el motor no se toca.
 *
 * Consecuencias que importan:
 *  - cada etapa se prueba aislada;
 *  - la lógica de "esto solo aplica a eléctricos" vive en la única etapa que le
 *    concierne, en vez de repartirse por una función dios;
 *  - ninguna etapa contiene un número. Las tarifas entran por `ctx.input`.
 */
export interface CostStage {
  /** Código estable. Es también la clave i18n y la referencia en el PDF. */
  readonly code: string;
  readonly block: CostBlock;

  /**
   * Orden de CÁLCULO, disperso (10, 20, 30…) para poder insertar sin renumerar.
   *
   * No coincide con el orden de presentación: los costos de destino se calculan
   * ANTES de los tributos, porque la base del impoconsumo los incluye, pero se
   * muestran DESPUÉS. Por eso `displayOrder` existe aparte.
   */
  readonly order: number;
  readonly displayOrder: number;

  /** Etapas cuyo resultado esta etapa lee. Se valida antes de ejecutar. */
  readonly requires?: readonly string[];

  appliesTo(ctx: PricingContext): boolean;
  compute(ctx: PricingContext): LineItem[];
}

/**
 * Ordena por dependencias y detecta ciclos.
 *
 * Falla ruidosamente ante una dependencia ausente o circular: un motor que se
 * ejecuta a medias produce un total incompleto que parece correcto, y ese es
 * exactamente el error que este sistema no puede permitirse.
 */
export function resolveStageOrder(
  stages: readonly CostStage[],
): readonly CostStage[] {
  const byCode = new Map(stages.map((s) => [s.code, s]));

  for (const stage of stages) {
    for (const dependency of stage.requires ?? []) {
      if (!byCode.has(dependency)) {
        throw new Error(
          `La etapa "${stage.code}" declara la dependencia "${dependency}", que no existe en el registro.`,
        );
      }
    }
  }

  const sorted: CostStage[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (stage: CostStage, path: readonly string[]): void => {
    if (visited.has(stage.code)) return;
    if (visiting.has(stage.code)) {
      throw new Error(
        `Ciclo de dependencias entre etapas: ${[...path, stage.code].join(" -> ")}`,
      );
    }
    visiting.add(stage.code);
    for (const dependency of stage.requires ?? []) {
      const next = byCode.get(dependency);
      if (next) visit(next, [...path, stage.code]);
    }
    visiting.delete(stage.code);
    visited.add(stage.code);
    sorted.push(stage);
  };

  for (const stage of [...stages].sort((a, b) => a.order - b.order)) {
    visit(stage, []);
  }

  return sorted;
}
