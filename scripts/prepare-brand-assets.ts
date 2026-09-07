/**
 * Prepara los recursos de marca que entrega el cliente.
 *
 * El logotipo llega como un PNG grande con mucho aire transparente alrededor.
 * Usarlo tal cual en el encabezado obliga a escalarlo a ojo y deja el símbolo
 * descentrado respecto al texto de al lado, así que aquí se recorta al arte
 * real y se derivan dos piezas:
 *
 *   logo-full.png  — el lockup completo, para el pie y las pantallas de acceso
 *   logo-mark.png  — solo la "A", para el encabezado y los sitios estrechos
 *
 * Las fotografías de estudio se reescalan al ancho que usa la vitrina. Llegan a
 * ~520 px, que se ve borroso en una ficha de 380 px en pantallas de alta
 * densidad; se suben a 1100 y se guardan como JPEG de calidad alta, que pesa
 * una fracción del PNG original sin diferencia visible sobre fondo claro.
 *
 *   npx tsx scripts/prepare-brand-assets.ts
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const BRAND_IN = "public/brand";
const BRAND_OUT = "public/brand";
const CARD_WIDTH = 1100;

async function prepareLogo() {
  const source = sharp(`${BRAND_IN}/logo.png`);

  // `trim` recorta el borde uniforme —aquí, el transparente— dejando el arte.
  const trimmed = await source.clone().trim().toBuffer({ resolveWithObject: true });
  const { width, height } = trimmed.info;

  await sharp(trimmed.data).png({ compressionLevel: 9 }).toFile(`${BRAND_OUT}/logo-full.png`);
  console.log(`  logo-full.png   ${width}x${height}`);

  /**
   * Dónde termina el símbolo y empieza el texto.
   *
   * No se adivina con una proporción: se MIDE. Se suma el alfa de cada columna
   * y se busca el primer hueco vertical completamente vacío después del
   * símbolo — el espacio que el propio diseño dejó entre la "A" y la palabra.
   * Un porcentaje a ojo cortaba el asta derecha de la letra.
   */
  const { data: alpha, info } = await sharp(trimmed.data)
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const columnHasInk = (x: number) => {
    for (let y = 0; y < info.height; y += 1) {
      if ((alpha[y * info.width + x] ?? 0) > 12) return true;
    }
    return false;
  };

  const GAP = 12; // columnas vacías seguidas que cuentan como separación
  let markWidth = info.width;
  let empty = 0;
  for (let x = 0; x < info.width; x += 1) {
    empty = columnHasInk(x) ? 0 : empty + 1;
    if (empty >= GAP && x > info.height * 0.4) {
      markWidth = x - empty + 1;
      break;
    }
  }

  await sharp(trimmed.data)
    .extract({ left: 0, top: 0, width: markWidth, height })
    .resize({ width: 256, height: 256, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(`${BRAND_OUT}/logo-mark.png`);
  console.log(`  logo-mark.png   256x256 (símbolo medido: ${markWidth}x${height})`);
}

/** Qué fotografía de estudio corresponde a qué vehículo del catálogo. */
const PHOTOS: readonly { file: string; slug: string; label: string }[] = [
  { file: "Screenshot_1.png", slug: "tesla-model-3-long-range-awd-2026", label: "Tesla Model 3" },
  { file: "Screenshot_2.png", slug: "zeekr-x-privilege-awd-2026", label: "Zeekr X" },
  { file: "Screenshot_3.png", slug: "kia-ev6-gt-line-awd-77-4-kwh-2026", label: "Kia EV6" },
  { file: "Screenshot_4.png", slug: "volvo-ex30-ultra-twin-motor-2026", label: "Volvo EX30" },
  { file: "Screenshot_5.png", slug: "mazda-cx-5-signature-awd-2-5-2026", label: "Mazda CX-5" },
];

async function preparePhotos() {
  mkdirSync("public/vehicles", { recursive: true });

  for (const photo of PHOTOS) {
    const out = `public/vehicles/${photo.slug}.jpg`;
    const info = await sharp(`${BRAND_IN}/${photo.file}`)
      .resize({ width: CARD_WIDTH, withoutEnlargement: false })
      // Fondo blanco: las fotos de estudio traen alfa y un JPEG sin fondo
      // rellena con negro, que sobre un tema claro se ve como un marco sucio.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(out);

    console.log(
      `  ${photo.label.padEnd(16)} → ${out.split("/").pop()}  ${info.width}x${info.height}  ${Math.round(
        info.size / 1024,
      )} kB`,
    );
  }
}

async function main() {
  console.log("\nLogotipo\n");
  await prepareLogo();
  console.log("\nFotografías de estudio\n");
  await preparePhotos();
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
