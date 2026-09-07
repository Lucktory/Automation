/**
 * El embudo de pedidos, como REGISTRO.
 *
 * `OrderStatus` tiene veintiún miembros porque describe la operación con
 * precisión —hay diferencia real entre BOOKED y LOADED para quien coordina la
 * naviera—, pero un panel de dirección con veintiuna columnas no se lee. Aquí
 * se colapsan en las siete etapas que el negocio nombra en voz alta.
 *
 * Es un mapa y no una cadena de condicionales: añadir un estado al enum obliga
 * a decidir en qué etapa cae, y ese olvido se ve aquí en vez de convertirse en
 * un pedido que desaparece del embudo sin que nadie lo note.
 *
 * Los estados terminales —CANCELLED, REFUNDED, CLOSED, ON_HOLD— NO están en
 * ninguna etapa a propósito: no son parte del flujo, y sumarlos al embudo
 * inflaría el trabajo en curso con operaciones muertas.
 */

import type { OrderStatus } from "@prisma/client";

export interface FunnelStage {
  /** Clave i18n dentro de `admin.sections.dashboard.funnel`. */
  key: string;
  /** Miembros de `OrderStatus` que caen en esta etapa. */
  statuses: readonly OrderStatus[];
}

export const ORDER_FUNNEL: readonly FunnelStage[] = [
  { key: "confirmed", statuses: ["AWAITING_DEPOSIT", "CONFIRMED"] },
  { key: "sourcing", statuses: ["SOURCING", "PURCHASED", "ORIGIN_LOGISTICS"] },
  { key: "transit", statuses: ["BOOKED", "LOADED", "IN_TRANSIT"] },
  { key: "port", statuses: ["ARRIVED_PORT", "IN_FREE_ZONE"] },
  { key: "customs", statuses: ["NATIONALIZATION", "RELEASED"] },
  { key: "registration", statuses: ["DESTINATION_LOGISTICS", "UPFITTING", "REGISTRATION"] },
  { key: "delivered", statuses: ["READY_FOR_DELIVERY", "DELIVERED"] },
];

/** Estados que NO cuentan como trabajo en curso. */
export const FUNNEL_EXCLUDED: readonly OrderStatus[] = [
  "DRAFT",
  "CLOSED",
  "ON_HOLD",
  "CANCELLED",
  "REFUNDED",
];

/** En qué etapa cae un estado, o `null` si está fuera del flujo. */
export function stageOf(status: OrderStatus): FunnelStage | null {
  return ORDER_FUNNEL.find((stage) => stage.statuses.includes(status)) ?? null;
}
