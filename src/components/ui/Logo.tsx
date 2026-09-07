import Image from "next/image";
import { BRAND_LOGO } from "@/config/brand-images";

/**
 * El logotipo, en sus dos formas.
 *
 * `mark` es solo el símbolo y `full` el lockup completo con la bajada. Ambos
 * salen del mismo archivo que entregó el cliente, recortado por
 * `scripts/prepare-brand-assets.ts`: el original trae mucho aire transparente
 * alrededor y usarlo sin recortar deja el símbolo descentrado respecto al texto
 * que lleva al lado.
 *
 * Se usa `next/image` y no un `<img>` suelto porque son archivos locales de
 * tamaño conocido: así Next sirve el formato moderno, reserva el espacio y no
 * hay salto de maquetación al cargar la cabecera.
 */
export function Logo({
  variant = "mark",
  height = 28,
  className,
  priority = false,
}: {
  variant?: "mark" | "full";
  /** Alto en píxeles. El ancho se deduce de la proporción real del archivo. */
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const asset = variant === "full" ? BRAND_LOGO.full : BRAND_LOGO.mark;
  const width = Math.round((asset.width / asset.height) * height);

  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
