/**
 * Siembra prospectos y compradores para el CRM.
 *
 * Sin ellos /admin/clientes es una tabla vacía y el panel de control marca cero
 * prospectos — dos pantallas que el cliente abre en la demostración.
 *
 * Un `Lead` es cualquiera que levantó la mano; cuando además tiene cuenta se
 * enlaza con su `User` mediante `userId`, y entonces la pantalla de clientes lo
 * puede cruzar con sus cotizaciones y pedidos reales para calcular el valor
 * acumulado. Ese cruce es la razón de que aquí se enlace en vez de duplicar
 * nombres: el valor acumulado tiene que salir de las tablas de dinero, no de una
 * cifra escrita a mano.
 *
 * Los datos personales son inventados y colombianos y verosímiles: nombres,
 * ciudades y celulares con el prefijo +57. Ningún documento corresponde a una
 * persona real.
 *
 *   npx tsx scripts/seed-leads.ts
 */
import { config } from "dotenv";
import { PrismaClient, LeadSource, LeadStatus } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/**
 * Once personas. La mezcla importa: unos ya compraron, otros solo preguntaron,
 * y uno lleva más de un mes callado. Una lista donde todos están igual de vivos
 * no se parece a ningún CRM real.
 */
const PEOPLE: readonly {
  name: string;
  documentType: string;
  documentId: string;
  email: string;
  phone: string;
  city: string;
  source: LeadSource;
  status: LeadStatus;
  ageDays: number;
  /** Correo del `User` con el que se enlaza, si esta persona ya tiene cuenta. */
  accountEmail?: string;
}[] = [
  { name: "Andrea Gómez", documentType: "CC", documentId: "1.020.345.678", email: "andrea.gomez@gmail.com", phone: "+57 300 123 4567", city: "Bogotá", source: LeadSource.WHATSAPP, status: LeadStatus.WON, ageDays: 62 },
  { name: "Carlos Rodríguez", documentType: "CC", documentId: "71.234.567", email: "carlos.rodriguez@outlook.com", phone: "+57 310 987 6543", city: "Medellín", source: LeadSource.QUOTE_SIMULATOR, status: LeadStatus.NEW, ageDays: 1 },
  { name: "Camila Restrepo", documentType: "CC", documentId: "1.144.567.890", email: "camila.restrepo@gmail.com", phone: "+57 321 456 7890", city: "Cali", source: LeadSource.INSTAGRAM, status: LeadStatus.NEGOTIATING, ageDays: 24 },
  { name: "Juan Manuel Pérez", documentType: "NIT", documentId: "901.234.567-8", email: "juanperez@empresa.com", phone: "+57 300 567 8901", city: "Barranquilla", source: LeadSource.WEB_FORM, status: LeadStatus.WON, ageDays: 88 },
  { name: "Sofía Pardo", documentType: "CC", documentId: "1.098.765.432", email: "sofia.pardo@gmail.com", phone: "+57 318 765 4321", city: "Bucaramanga", source: LeadSource.FACEBOOK, status: LeadStatus.NEW, ageDays: 1 },
  { name: "Luis Martínez", documentType: "CC", documentId: "79.876.543", email: "luis.martinez@hotmail.com", phone: "+57 312 345 6789", city: "Bogotá", source: LeadSource.TUCARRO, status: LeadStatus.QUOTED, ageDays: 31 },
  { name: "Daniela Vargas", documentType: "CC", documentId: "1.053.678.901", email: "daniela.vargas@gmail.com", phone: "+57 301 234 5678", city: "Manizales", source: LeadSource.CARROYA, status: LeadStatus.NEW, ageDays: 4 },
  { name: "Jorge Ramírez", documentType: "CE", documentId: "456.789", email: "jorge.ramirez@outlook.com", phone: "+57 320 987 1234", city: "Pereira", source: LeadSource.REFERRAL, status: LeadStatus.QUALIFIED, ageDays: 19 },
  { name: "María Castaño", documentType: "CC", documentId: "1.111.222.333", email: "maria.castano@gmail.com", phone: "+57 315 678 9012", city: "Cartagena", source: LeadSource.PAID_ADS, status: LeadStatus.CONTACTED, ageDays: 9 },
  { name: "Felipe Herrera", documentType: "PAS", documentId: "A12345678", email: "felipe.herrera@gmail.com", phone: "+57 322 111 2222", city: "Cúcuta", source: LeadSource.ORGANIC, status: LeadStatus.LOST, ageDays: 47 },
  { name: "Natalia Velásquez", documentType: "CC", documentId: "1.222.333.444", email: "natalia.velasquez@gmail.com", phone: "+57 321 987 6543", city: "Ibagué", source: LeadSource.WHATSAPP, status: LeadStatus.NEGOTIATING, ageDays: 15 },
];

async function main() {
  const existing = await prisma.lead.count();
  if (existing > 0) {
    await prisma.lead.deleteMany({});
    console.log(`  limpiados ${existing} prospectos anteriores`);
  }

  // Las cuentas de cliente ya sembradas: los prospectos que coincidan por
  // nombre se enganchan a ellas para que el valor acumulado sea real.
  const accounts = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      documentType: true,
      documentId: true,
    },
  });
  const byName = new Map(accounts.map((a) => [a.name?.toLowerCase() ?? "", a]));

  const owners = await prisma.user.findMany({
    where: { role: { in: ["SALES", "ADMIN"] } },
    select: { id: true },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: { isPublished: true },
    select: { id: true },
  });

  let created = 0;
  const takenAccounts = new Set<string>();

  for (const [index, person] of PEOPLE.entries()) {
    const account = byName.get(person.name.toLowerCase());
    const owner = owners[index % Math.max(1, owners.length)];
    const vehicle = vehicles[index % Math.max(1, vehicles.length)];

    // `userId` es único en el modelo: dos prospectos no pueden apuntar a la
    // misma cuenta, así que se reclama una sola vez.
    const linkable = account && !takenAccounts.has(account.id);
    if (linkable) takenAccounts.add(account.id);

    await prisma.lead.create({
      data: {
        name: person.name,
        email: person.email,
        phone: person.phone,
        city: person.city,
        documentType: person.documentType,
        documentId: person.documentId,
        source: person.source,
        status: person.status,
        locale: "es",
        ...(linkable ? { userId: account.id } : {}),
        ...(owner ? { ownerId: owner.id } : {}),
        ...(vehicle ? { interestVehicleId: vehicle.id } : {}),
        dataConsentAt: daysAgo(person.ageDays),
        createdAt: daysAgo(person.ageDays),
      },
    });
    created += 1;
    console.log(
      `  ok ${person.name.padEnd(20)} ${person.status.padEnd(12)} ${person.source.padEnd(16)}${linkable ? " (con cuenta)" : ""}`,
    );
  }

  // Los compradores ya sembrados que no aparecen arriba también tienen que
  // existir en el CRM: si no, la pantalla de clientes muestra menos gente que
  // la de cotizaciones y las dos se contradicen.
  for (const account of accounts) {
    if (takenAccounts.has(account.id)) continue;
    // Los datos se copian de la cuenta, no se inventan: esta persona ya existe
    // en el sistema y el CRM tiene que decir de ella exactamente lo mismo que
    // dice su ficha de usuario.
    await prisma.lead.create({
      data: {
        name: account.name ?? account.email,
        email: account.email,
        ...(account.phone ? { phone: account.phone } : {}),
        ...(account.city ? { city: account.city } : {}),
        ...(account.documentType ? { documentType: account.documentType } : {}),
        ...(account.documentId ? { documentId: account.documentId } : {}),
        source: LeadSource.WEB_FORM,
        status: LeadStatus.WON,
        locale: "es",
        userId: account.id,
        createdAt: daysAgo(70),
      },
    });
    created += 1;
    console.log(`  ok ${(account.name ?? account.email).padEnd(20)} WON          (cuenta existente)`);
  }

  console.log(`\n${created} prospectos sembrados.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
