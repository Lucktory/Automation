/**
 * Siembra pedidos repartidos por el embudo.
 *
 * Sin ellos el panel de control enseña un embudo de ceros, «Pedidos en curso»
 * en cero y el portal del cliente sin nada que seguir — tres pantallas que el
 * cliente va a abrir en la demostración.
 *
 * Cada pedido nace de una COTIZACIÓN real cuando la hay, así que su total es el
 * que produjo el motor y no una cifra inventada. Los que no tienen cotización
 * detrás toman el costo puesto en Colombia ya calculado del vehículo.
 *
 * También escribe el historial de estados (`OrderStatusEvent`), porque un
 * pedido en "Nacionalización" sin rastro de cómo llegó ahí es un dato plano:
 * la torre de control existe justamente para mostrar el camino.
 *
 *   npx tsx scripts/seed-orders.ts
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { ORDER_FUNNEL } from "../src/config/order-funnel";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY);

/**
 * El reparto del embudo. Refleja una operación sana: mucho en tránsito, poco
 * recién confirmado, y algo entregado. Un embudo plano —uno por etapa— parece
 * exactamente lo que es, una lista de ejemplo.
 *
 * `stuckDays` marca el pedido detenido que el panel debe denunciar en rojo.
 */
const PLAN: readonly {
  status: string;
  documentary: "GREEN" | "AMBER" | "RED" | "GREY";
  physical: "GREEN" | "AMBER" | "RED" | "GREY";
  ageDays: number;
  etaDays: number;
  stuckDays?: number;
}[] = [
  { status: "CONFIRMED", documentary: "GREEN", physical: "GREY", ageDays: 4, etaDays: 78 },
  { status: "PURCHASED", documentary: "GREEN", physical: "GREEN", ageDays: 12, etaDays: 66 },
  { status: "IN_TRANSIT", documentary: "GREEN", physical: "GREEN", ageDays: 28, etaDays: 44 },
  { status: "IN_TRANSIT", documentary: "AMBER", physical: "GREEN", ageDays: 33, etaDays: 39 },
  { status: "ARRIVED_PORT", documentary: "GREEN", physical: "AMBER", ageDays: 47, etaDays: 22 },
  { status: "NATIONALIZATION", documentary: "RED", physical: "AMBER", ageDays: 56, etaDays: 14, stuckDays: 9 },
  { status: "REGISTRATION", documentary: "GREEN", physical: "GREEN", ageDays: 71, etaDays: 6 },
  { status: "DELIVERED", documentary: "GREEN", physical: "GREEN", ageDays: 96, etaDays: -8 },
];

/** El camino que recorrió un pedido hasta su estado actual. */
const PATH = [
  "AWAITING_DEPOSIT",
  "CONFIRMED",
  "SOURCING",
  "PURCHASED",
  "BOOKED",
  "IN_TRANSIT",
  "ARRIVED_PORT",
  "NATIONALIZATION",
  "RELEASED",
  "REGISTRATION",
  "DELIVERED",
] as const;

async function main() {
  // Los pedidos no llevan disparador de inmutabilidad: se pueden rehacer.
  const existing = await prisma.order.count();
  if (existing > 0) {
    await prisma.order.deleteMany({});
    console.log(`  limpiados ${existing} pedidos anteriores`);
  }

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, name: true },
  });
  const managers = await prisma.user.findMany({
    where: { role: "SALES" },
    select: { id: true },
  });
  const vehicles = await prisma.vehicle.findMany({
    where: { isPublished: true, estLandedCop: { not: null } },
    select: {
      id: true,
      estLandedCop: true,
      trim: { select: { name: true, model: { select: { name: true, brand: { select: { name: true } } } } } },
    },
  });
  const quotes = await prisma.quote.findMany({
    select: { id: true, totalCop: true, customerId: true },
    orderBy: { sequence: "asc" },
  });

  if (customers.length === 0 || vehicles.length === 0) {
    throw new Error("Faltan clientes o vehículos. Ejecuta la siembra primero.");
  }

  const year = new Date().getFullYear();
  let issued = 0;

  for (const [index, plan] of PLAN.entries()) {
    const vehicle = vehicles[index % vehicles.length]!;
    const manager = managers[index % Math.max(1, managers.length)];
    const quote = quotes[index] ?? null;

    // El pedido es de quien pidió la COTIZACIÓN, no de quien toque por turno.
    // Repartiendo clientes en rotación, un pedido acababa a nombre de alguien
    // distinto al de su propia cotización: entonces la misma venta se contaba
    // una vez como pedido en una ficha y otra como cotización aceptada en otra,
    // y la cartera salía inflada sin que ninguna fila pareciera equivocada.
    const customer =
      (quote?.customerId
        ? customers.find((person) => person.id === quote.customerId)
        : undefined) ?? customers[index % customers.length]!;

    const label = `${vehicle.trim.model.brand.name} ${vehicle.trim.model.name} ${vehicle.trim.name}`;
    const total = quote ? Number(quote.totalCop) : Number(vehicle.estLandedCop);
    const deposit = 20_000_000;
    // Entregado y matrícula ya pagaron todo; el resto solo el anticipo.
    const paid = ["REGISTRATION", "DELIVERED"].includes(plan.status) ? total : deposit;

    const created = daysAgo(plan.ageDays);
    const reference = `PED-${year}-${String(index + 1).padStart(4, "0")}`;

    const order = await prisma.order.create({
      data: {
        reference,
        status: plan.status as never,
        locale: "es",
        customerId: customer.id,
        ...(manager ? { accountManagerId: manager.id } : {}),
        ...(quote ? { quoteId: quote.id } : {}),
        totalCop: total,
        depositCop: deposit,
        paidCop: paid,
        documentaryLight: plan.documentary as never,
        physicalLight: plan.physical as never,
        estimatedDeliveryAt: daysAhead(plan.etaDays),
        ...(plan.status === "DELIVERED" ? { deliveredAt: daysAgo(8) } : {}),
        createdAt: created,
        items: {
          create: {
            vehicleId: vehicle.id,
            descriptionEs: label,
            unitPriceCop: total,
            quantity: 1,
          },
        },
      },
      select: { id: true, reference: true },
    });

    // Historial: cada paso del camino hasta el estado actual.
    //
    // El último salto NO se reparte con los demás. Repartir los diez pasos por
    // igual a lo largo de la vida del pedido deja siempre el último a
    // `ageDays/pasos` de hoy —una semana entera en los pedidos viejos—, así que
    // el panel los denunciaba a todos como detenidos. La antigüedad del pedido
    // y el tiempo que lleva parado son dos cosas distintas, y esta es la que
    // mide la segunda: sólo el pedido marcado con `stuckDays` lleva tiempo sin
    // moverse; el resto cambió de estado hace uno o dos días.
    const reached = PATH.slice(0, PATH.indexOf(plan.status as never) + 1);
    const idleDays = plan.stuckDays ?? 1 + (index % 2);
    const span = Math.max(0, plan.ageDays - idleDays);
    const step = span / Math.max(1, reached.length - 1);

    await prisma.orderStatusEvent.createMany({
      data: reached.map((status, position) => ({
        orderId: order.id,
        ...(position > 0 ? { fromStatus: reached[position - 1] as never } : {}),
        toStatus: status as never,
        createdAt:
          position === reached.length - 1
            ? daysAgo(idleDays)
            : daysAgo(plan.ageDays - step * position),
        ...(plan.stuckDays && status === plan.status
          ? { note: `Detenido hace ${plan.stuckDays} días a la espera de documentos.` }
          : {}),
      })),
    });

    issued += 1;
    const cop = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
    console.log(
      `  ok ${order.reference}  ${plan.status.padEnd(16)} ${label.padEnd(34)} ${cop.format(total)} COP`,
    );
  }

  // Comprobación: todo pedido tiene que caer en alguna etapa del embudo.
  const rows = await prisma.order.groupBy({ by: ["status"], _count: true });
  const orphan = rows.filter(
    (row) => !ORDER_FUNNEL.some((stage) => stage.statuses.includes(row.status)),
  );
  if (orphan.length > 0) {
    console.log(`\n  AVISO: estados fuera del embudo: ${orphan.map((o) => o.status).join(", ")}`);
  }

  console.log(`\n${issued} pedidos sembrados.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
