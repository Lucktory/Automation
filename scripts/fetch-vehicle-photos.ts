/**
 * Descarga fotografías reales de cada vehículo del catálogo.
 *
 * Vienen de Wikimedia Commons, que es la única fuente grande de fotos de
 * modelos concretos con licencia que permite usarlas. Se guardan en
 * `public/vehicles/` en vez de enlazarse en caliente: una demostración no puede
 * depender de que un servidor ajeno responda, y un enlace roto en la vitrina es
 * peor que no tener foto.
 *
 * La atribución NO es opcional. Las licencias CC BY y CC BY-SA exigen nombrar
 * al autor, así que el autor y la licencia se guardan en `alt` y la página del
 * archivo en `sourceUrl`. Si el cliente sustituye estas fotos por las suyas,
 * ambas cosas desaparecen con la fila.
 *
 *   npx tsx scripts/fetch-vehicle-photos.ts
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const OUT_DIR = "public/vehicles";
const THUMB_WIDTH = 1400;
const CANDIDATES = 14;
const UA = "AutomocionOS-Demo/1.0 (contacto: comercial@automocionos.co)";

/**
 * Palabras que delatan una foto que no sirve para una vitrina: interiores,
 * detalles y tomas traseras. Se busca el tres cuartos delantero, que es como se
 * fotografía un coche a la venta.
 */
const REJECT = [
  "interior", "interieur", "innenraum", "dashboard", "cockpit", "seat", "asiento",
  "engine", "motor ", "boot", "trunk", "maletero", "wheel", "rim", "llanta",
  "badge", "logo", "emblem", "detail", "headlight", "taillight", "faro",
  "charging", "chassis", "cutaway", "rear", "heck", "trasera", "back",
  "diagram", "map", "chart", "svg", "poster",
];

const PREFER = ["front", "frente", "delantera", "3/4", "exterior", "auto show", "salon"];

interface Candidate {
  title: string;
  thumbUrl: string;
  descriptionUrl: string;
  author: string;
  license: string;
  width: number;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compara ignorando espacios y guiones.
 *
 * Es lo que impide que una búsqueda de "Mazda CX-5" acepte una foto de un
 * CX-80: "cx5" no está contenido en "cx80". Sin esta comprobación el buscador
 * de Commons devuelve el modelo vecino y la vitrina enseña otro coche — el tipo
 * de error que un comprador detecta antes que nadie.
 */
const squash = (value: string) => value.toLowerCase().replace(/[\s\-_.]/g, "");

async function search(query: string): Promise<Candidate[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search" +
    `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${CANDIDATES}` +
    `&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=${THUMB_WIDTH}`;

  const data = (await fetch(url, { headers: { "User-Agent": UA } }).then((r) =>
    r.json(),
  )) as {
    query?: { pages?: Record<string, {
      title: string;
      imageinfo?: {
        thumburl?: string;
        descriptionurl?: string;
        width?: number;
        mime?: string;
        extmetadata?: Record<string, { value?: string }>;
      }[];
    }> };
  };

  const pages = Object.values(data.query?.pages ?? {});
  const out: Candidate[] = [];

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info.mime?.startsWith("image/")) continue;
    if (info.mime === "image/svg+xml") continue;
    if ((info.width ?? 0) < 900) continue;

    const title = page.title.toLowerCase();
    if (REJECT.some((word) => title.includes(word))) continue;

    out.push({
      title: page.title.replace(/^File:/, ""),
      thumbUrl: info.thumburl,
      descriptionUrl: info.descriptionurl ?? "",
      author: stripHtml(info.extmetadata?.Artist?.value ?? "Wikimedia Commons"),
      license: stripHtml(info.extmetadata?.LicenseShortName?.value ?? "CC"),
      width: info.width ?? 0,
    });
  }

  // El tres cuartos delantero primero; a igualdad, la foto más grande.
  return out.sort((a, b) => {
    const score = (c: Candidate) =>
      PREFER.some((word) => c.title.toLowerCase().includes(word)) ? 1 : 0;
    return score(b) - score(a) || b.width - a.width;
  });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const vehicles = await prisma.vehicle.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      modelYear: true,
      trim: {
        select: { model: { select: { name: true, brand: { select: { name: true } } } } },
      },
    },
  });

  let saved = 0;
  for (const vehicle of vehicles) {
    const brand = vehicle.trim.model.brand.name;
    const model = vehicle.trim.model.name;
    const label = `${brand} ${model}`;

    // Dos intentos: primero acotado, luego abierto. En ambos el título tiene que
    // NOMBRAR el modelo; si no, se prefiere quedarse sin foto antes que publicar
    // otro coche.
    const needle = squash(model);
    let pick: Candidate | undefined;

    for (const query of [`${label} car`, label]) {
      const found = (await search(query)).find((c) => squash(c.title).includes(needle));
      if (found) {
        pick = found;
        break;
      }
    }

    if (!pick) {
      console.log(`  —  ${label.padEnd(26)} sin foto utilizable`);
      continue;
    }

    const response = await fetch(pick.thumbUrl, { headers: { "User-Agent": UA } });
    const bytes = Buffer.from(new Uint8Array(await response.arrayBuffer()));

    const file = `${vehicle.slug}.jpg`;
    writeFileSync(`${OUT_DIR}/${file}`, bytes);

    await prisma.vehicleImage.deleteMany({ where: { vehicleId: vehicle.id } });
    await prisma.vehicleImage.create({
      data: {
        vehicleId: vehicle.id,
        url: `/vehicles/${file}`,
        alt: `${label} ${vehicle.modelYear} — foto: ${pick.author} (${pick.license})`,
        sourceUrl: pick.descriptionUrl,
        isPrimary: true,
        sortOrder: 0,
        width: THUMB_WIDTH,
      },
    });

    saved += 1;
    console.log(
      `  ok ${label.padEnd(26)} ${Math.round(bytes.length / 1024)
        .toString()
        .padStart(4)} kB · ${pick.license} · ${pick.title.slice(0, 46)}`,
    );
  }

  console.log(`\n${saved}/${vehicles.length} vehículos con fotografía.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
