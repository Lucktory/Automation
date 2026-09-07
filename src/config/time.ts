/**
 * El huso horario del negocio, en un solo sitio.
 *
 * La operación es colombiana: `America/Bogota`, UTC-5 fijo, sin horario de
 * verano. El servidor, en cambio, corre en UTC. Esa diferencia de cinco horas
 * es invisible casi siempre y catastrófica una vez al año.
 *
 * El caso concreto: una cotización guardada el 31 de diciembre a las 19:30 en
 * Bogotá son las 00:30 del 1 de enero en UTC. Numerarla con
 * `new Date().getUTCFullYear()` produce COT-2027-0001 en un documento fechado
 * el 31 de diciembre, y reinicia el consecutivo cinco horas antes de tiempo.
 * Cualquier contador que concilie la oferta contra los libros de 2026 lo nota.
 *
 * Por eso el año de emisión NO se deriva nunca de `createdAt` más tarde: se
 * calcula aquí, una vez, y se guarda como columna.
 */
export const BUSINESS_TIME_ZONE = "America/Bogota";

/** Locale ICU usado para resolver la fecha civil; el idioma no importa aquí. */
const CIVIL_LOCALE = "en-CA"; // en-CA formatea como YYYY-MM-DD

/**
 * La fecha civil en Bogotá para un instante dado, como `YYYY-MM-DD`.
 *
 * Se resuelve con `Intl` en vez de restando cinco horas a mano: el desfase es
 * un dato del huso, no una constante que debamos mantener nosotros.
 */
export function civilDateInBusinessZone(instant: Date): string {
  return new Intl.DateTimeFormat(CIVIL_LOCALE, {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** El año civil en Bogotá. Es el que numera las cotizaciones. */
export function civilYearInBusinessZone(instant: Date): number {
  const year = Number(civilDateInBusinessZone(instant).slice(0, 4));
  if (!Number.isInteger(year)) {
    throw new RangeError(`No se pudo resolver el año civil de ${instant.toISOString()}.`);
  }
  return year;
}
