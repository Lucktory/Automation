/**
 * Siembra la biblioteca de piezas sociales.
 *
 * Una pieza es una imagen DERIVADA: nace de la ficha del vehículo y de su costo
 * puesto en Colombia. Por eso aquí no se inventa ninguna imagen ni ningún
 * precio — se recorren los vehículos publicados que ya tienen fotografía y se
 * les generan las plantillas del registro. `imageUrl` apunta a la misma foto
 * que usa el catálogo, que es de donde saldría la creatividad real.
 *
 * El reparto entre publicadas y borradores no es uniforme a propósito: una
 * biblioteca donde todo está publicado no tiene nada que hacer, y el panel
 * existe para señalar lo que falta por sacar.
 *
 *   npx tsx scripts/seed-social.ts
 */
import { config } from "dotenv";
import { PrismaClient, SocialAssetStatus, type SocialTemplate } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { SOCIAL_TEMPLATES, SOCIAL_TEMPLATE_ORDER } from "../src/config/social-templates";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/**
 * Cuántas plantillas recibe cada vehículo, por orden de catálogo.
 *
 * Los primeros son los que la operación está empujando y llevan el juego
 * completo; los últimos, sólo la ficha cuadrada. Darle las cinco a todos
 * produciría una rejilla perfectamente regular, que es la señal más clara de
 * que unos datos son de mentira.
 */
const TEMPLATES_PER_VEHICLE = [5, 5, 4, 3, 3, 2, 2, 1, 1, 1];

async function main() {
  const existing = await prisma.socialAsset.count();
  if (existing > 0) {
    await prisma.socialAsset.deleteMany({});
    console.log(`  limpiadas ${existing} piezas anteriores`);
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { isPublished: true },
    orderBy: { estLandedCop: "asc" },
    select: {
      id: true,
      slug: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  });

  if (vehicles.length === 0) throw new Error("No hay vehículos publicados. Siembra el catálogo primero.");

  let created = 0;
  let published = 0;
  let age = 0;

  for (const [index, vehicle] of vehicles.entries()) {
    const image = vehicle.images[0]?.url;
    if (!image) {
      console.log(`  omitido ${vehicle.slug} — sin fotografía`);
      continue;
    }

    const howMany = TEMPLATES_PER_VEHICLE[index] ?? 1;
    for (const template of SOCIAL_TEMPLATE_ORDER.slice(0, howMany)) {
      const spec = SOCIAL_TEMPLATES[template];

      // Las piezas más recientes son las que todavía no han salido.
      age += 1;
      const isPublished = age > 6;

      await prisma.socialAsset.create({
        data: {
          vehicleId: vehicle.id,
          template: template as SocialTemplate,
          locale: "es",
          imageUrl: image,
          width: spec.width,
          height: spec.height,
          status: isPublished ? SocialAssetStatus.PUBLISHED : SocialAssetStatus.DRAFT,
          ...(isPublished ? { publishedAt: daysAgo(age) } : {}),
          createdAt: daysAgo(age),
        },
      });
      created += 1;
      if (isPublished) published += 1;
    }

    console.log(`  ok ${vehicle.slug.padEnd(42)} ${howMany} pieza(s)`);
  }

  console.log(
    `\n${created} piezas sembradas — ${published} publicadas, ${created - published} sin publicar.\n`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
