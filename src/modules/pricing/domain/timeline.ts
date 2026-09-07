import type { TimelineEstimate, TimelineInput } from "./types";

/**
 * Estimación de tiempos, en días hábiles.
 *
 * No hay ningún número aquí: las seis fases llegan por `TimelineInput`. La
 * navegación sale de la tarifa de flete de la ruta y los días en puerto del
 * interruptor correspondiente, así que cambiar de origen mueve el plazo igual
 * que mueve el precio.
 *
 * Se declara aparte del resto del motor porque el plazo es lo segundo que
 * pregunta un comprador —después del precio— y el PDF lo imprime tal cual.
 */
export function estimateTimeline(input: TimelineInput): TimelineEstimate {
  const totalDays =
    input.sourcingDays +
    input.inlandOriginDays +
    input.oceanDays +
    input.portReleaseDays +
    input.nationalizationDays +
    input.registrationDays;

  return {
    sourcingDays: input.sourcingDays,
    inlandOriginDays: input.inlandOriginDays,
    oceanDays: input.oceanDays,
    portReleaseDays: input.portReleaseDays,
    nationalizationDays: input.nationalizationDays,
    registrationDays: input.registrationDays,
    totalDays,
  };
}
