/**
 * Días hábiles por fase que todavía NO vienen de la base de datos.
 *
 * La navegación y los días en puerto sí son datos reales —salen de la tarifa de
 * flete de la ruta y del interruptor de puerto—, pero las otras cuatro fases no
 * tienen aún tabla de parámetros.
 *
 * DEUDA CONOCIDA, declarada aquí en vez de escondida en un componente: estos
 * cuatro valores deben pasar a `PricingParameterSet` con una pantalla en
 * /admin/parametros, igual que las tarifas. Mientras tanto viven en un solo
 * sitio, con nombre, y el plazo se muestra siempre como estimación.
 *
 * Provienen de la línea de tiempo de docs/SEED-DATA.md y son conservadores: un
 * plazo optimista que se incumple cuesta más que uno holgado que se adelanta.
 */
export const TIMELINE_DEFAULT_DAYS = {
  /** Identificar la unidad, cerrar la compra y pagar en origen. */
  sourcingDays: 5,
  /** Recogida y traslado interno hasta el puerto de embarque. */
  inlandOriginDays: 7,
  /** Descargue, inspección y levante. */
  portReleaseDays: 10,
  /** VUCE, declaración, tributos y liberación. */
  nationalizationDays: 18,
  /** RUNT, matrícula, placas y SOAT. */
  registrationDays: 10,
} as const;

/**
 * Fases de la línea de tiempo, en orden de presentación.
 *
 * Asocia cada campo de `TimelineEstimate` con su clave de traducción. Existe
 * porque el motor nombra los campos por lo que MIDEN (`portReleaseDays`) y la
 * pantalla los nombra por lo que el comprador VE ("Puerto"), y recorrer el
 * objeto del resultado esperando que sus llaves sirvan de clave i18n imprime el
 * nombre del campo en pantalla.
 */
export const TIMELINE_PHASES = [
  { field: "sourcingDays", messageKey: "PURCHASE" },
  { field: "inlandOriginDays", messageKey: "ORIGIN" },
  { field: "oceanDays", messageKey: "OCEAN" },
  { field: "portReleaseDays", messageKey: "PORT" },
  { field: "nationalizationDays", messageKey: "NATIONALIZATION" },
  { field: "registrationDays", messageKey: "REGISTRATION" },
] as const satisfies readonly { field: keyof typeof TIMELINE_DEFAULT_DAYS | "oceanDays"; messageKey: string }[];
