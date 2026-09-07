import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { SocialLayout } from "@/config/social-templates";

/**
 * La vista previa de una pieza social — la pieza de verdad, no un marcador.
 *
 * Un rectángulo gris con las dimensiones dentro no sirve para lo único que se
 * revisa en esta pantalla: si el encuadre funciona, si el precio se lee sobre la
 * foto, si el titular tapa el coche. La creatividad se compone aquí con la misma
 * fotografía y la misma cifra que llevaría la imagen exportada, así que lo que
 * se ve en la rejilla es lo que se publicaría.
 *
 * Cada disposición del registro tiene su rama. El marco lleva la proporción real
 * del formato, de modo que la historia vertical se ve alta y la imagen para
 * enlaces se ve apaisada sin necesidad de leer las cifras.
 *
 * El texto va en unidades relativas al ancho del marco (`cqw`), no en píxeles:
 * la misma pieza tiene que verse igual de equilibrada en la rejilla de cuatro
 * columnas y en el diálogo de previsualización, y con tamaños fijos el titular
 * se comería la tarjeta pequeña.
 */

export interface SocialPieceProps {
  layout: SocialLayout;
  width: number;
  height: number;
  imageUrl: string;
  /** Marca y modelo, en mayúsculas dentro de la pieza. */
  headline: string;
  /** Una o dos líneas de reclamo. */
  claim: string;
  /** El costo puesto en Colombia, ya formateado. */
  price: string;
  /** Etiqueta bajo la cifra: «Puesto en Colombia». */
  priceLabel: string;
  /** Llamada a la acción de la pieza apaisada. */
  cta: string;
}

/** Sombra inferior para que la cifra blanca se lea sobre cualquier fotografía. */
const SCRIM = "absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent";

function Photo({ url, alt, priority = false }: { url: string; alt: string; priority?: boolean }) {
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, 320px"
      className="object-cover"
      priority={priority}
    />
  );
}

export function SocialPiece({
  layout,
  width,
  height,
  imageUrl,
  headline,
  claim,
  price,
  priceLabel,
  cta,
}: SocialPieceProps) {
  const frame = {
    aspectRatio: `${width} / ${height}`,
    containerType: "inline-size" as const,
  };

  if (layout === "story") {
    return (
      <div style={frame} className="relative w-full overflow-hidden bg-[#0b0d10]">
        <div className="absolute inset-0">
          <Photo url={imageUrl} alt={headline} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/85" />
        </div>

        <div className="relative flex h-full flex-col justify-between p-[6cqw]">
          <div>
            <p className="font-display text-[9cqw] leading-[1.05] font-bold text-white uppercase">
              {headline}
            </p>
            <p className="mt-[2cqw] text-[4cqw] leading-snug font-medium tracking-wide text-white/85 uppercase">
              {claim}
            </p>
          </div>
          <div>
            <p className="font-display text-[8cqw] leading-none font-bold text-white" data-numeric>
              {price}
            </p>
            <p className="mt-[1.5cqw] text-[3.4cqw] text-white/75">{priceLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "gallery") {
    return (
      <div style={frame} className="relative flex w-full flex-col overflow-hidden bg-[#dbe4ec]">
        <div className="relative flex-1">
          <Photo url={imageUrl} alt={headline} />
          <div className="absolute inset-x-0 top-0 p-[5cqw]">
            <p className="font-display text-[7.5cqw] leading-[1.05] font-bold text-[#0b0d10] uppercase">
              {claim}
            </p>
          </div>
        </div>
        {/* Tira de miniaturas: el carrusel enseña varias vistas del mismo coche. */}
        <div className="grid shrink-0 grid-cols-3 gap-[2cqw] p-[3cqw]">
          {[0, 1, 2].map((index) => (
            <div key={index} className="relative aspect-[4/3] overflow-hidden bg-black/10">
              <Photo url={imageUrl} alt="" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "card") {
    return (
      <div style={frame} className="flex w-full flex-col overflow-hidden bg-white">
        <div className="p-[6cqw] pb-[3cqw]">
          <p className="font-display text-[8cqw] leading-none font-bold text-[#0b0d10] uppercase">
            {headline}
          </p>
          <p className="mt-[2cqw] text-[3.8cqw] leading-snug text-[#4a5561]">{claim}</p>
        </div>
        <div className="relative flex-1">
          <Photo url={imageUrl} alt={headline} />
        </div>
        <div className="p-[6cqw] pt-[3cqw]">
          <p className="font-display text-[7cqw] leading-none font-bold text-[#0b0d10]" data-numeric>
            {price}
          </p>
          <p className="mt-[1.5cqw] text-[3.4cqw] text-[#79838f]">{priceLabel}</p>
        </div>
      </div>
    );
  }

  if (layout === "link") {
    return (
      <div style={frame} className="relative w-full overflow-hidden bg-[#0b0d10]">
        <div className="absolute inset-0">
          <Photo url={imageUrl} alt={headline} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
        </div>

        <div className="relative flex h-full w-[62%] flex-col justify-between p-[4cqw]">
          <div>
            <p className="font-display text-[6.5cqw] leading-[1.05] font-bold text-white uppercase">
              {headline}
            </p>
            <p className="mt-[1.5cqw] text-[3cqw] leading-snug text-white/80">{claim}</p>
          </div>
          <div className="flex items-end justify-between gap-[3cqw]">
            <div>
              <p className="font-display text-[5.5cqw] leading-none font-bold text-white" data-numeric>
                {price}
              </p>
              <p className="mt-[1cqw] text-[2.6cqw] text-white/70">{priceLabel}</p>
            </div>
            <span className="flex items-center gap-[1.5cqw] rounded-full bg-white/95 px-[3cqw] py-[1.6cqw] text-[2.6cqw] font-medium whitespace-nowrap text-[#0b0d10]">
              {cta}
              <ArrowRight className="size-[3cqw]" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // "hero" — la ficha cuadrada: titular arriba, cifra abajo.
  return (
    <div style={frame} className="relative w-full overflow-hidden bg-[#0b0d10]">
      <div className="absolute inset-0">
        <Photo url={imageUrl} alt={headline} priority />
        <div className={SCRIM} />
        <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/55 to-transparent" />
      </div>

      <div className="relative flex h-full flex-col justify-between p-[6cqw]">
        <div>
          <p className="font-display text-[9cqw] leading-[0.95] font-bold text-white uppercase">
            {headline}
          </p>
          <p className="mt-[2.5cqw] text-[3.6cqw] leading-snug font-medium tracking-wide text-white/85 uppercase">
            {claim}
          </p>
        </div>
        <div>
          <p className="font-display text-[7.5cqw] leading-none font-bold text-white" data-numeric>
            {price}
          </p>
          <p className="mt-[1.5cqw] text-[3.2cqw] text-white/75">{priceLabel}</p>
        </div>
      </div>
    </div>
  );
}
