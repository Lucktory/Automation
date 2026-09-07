/**
 * Registro de imágenes de marca.
 *
 * Las rutas no se escriben en los componentes: una imagen se reemplaza aquí y
 * cambia en todos los sitios que la usan. El `alt` viaja con la imagen porque
 * describe la fotografía, no el lugar donde aparece.
 */

export interface BrandImage {
  src: string;
  width: number;
  height: number;
  /** Clave i18n del texto alternativo. */
  altKey: string;
  /**
   * Encuadre. `object-position` recorta hacia el sujeto cuando el contenedor es
   * mucho más estrecho que la imagen, como el panel de marca del login.
   */
  position: string;
}

export const BRAND_IMAGES = {
  /** Buque RoRo cargando vehículos al atardecer. Sin marcas ajenas visibles. */
  authPanel: {
    src: "/brand/port-roro.png",
    width: 1536,
    height: 1024,
    altKey: "images.portRoro",
    position: "30% center",
  },

  /**
   * Vehículo en muelle de noche.
   *
   * OJO: el buque del fondo lleva rotulado "GLOBAL AUTOMOTIVE LOGISTICS", una
   * marca que no es la nuestra. Solo puede usarse con un encuadre que deje ese
   * texto fuera, o retocada. No usar a sangre completa.
   */
  heroNight: {
    src: "/brand/port-vehicle-night.png",
    width: 1536,
    height: 1024,
    altKey: "images.portVehicleNight",
    position: "60% center",
  },
} as const satisfies Record<string, BrandImage>;

/**
 * El logotipo entregado por el cliente, ya recortado.
 *
 * Las dimensiones se guardan aquí porque `next/image` las necesita para
 * reservar el espacio antes de descargar el archivo. Si el cliente entrega un
 * logotipo nuevo, se vuelve a correr `npm run brand:prepare` y se actualizan
 * estas dos líneas — nada más cambia.
 *
 * El `alt` no dice "logotipo": dice el nombre de la empresa. Un lector de
 * pantalla que anuncia "logotipo" no comunica nada; el nombre sí.
 */
export const BRAND_LOGO = {
  full: {
    src: "/brand/logo-full.png",
    width: 1916,
    height: 302,
    alt: "Automoción OS · Vehículos globales. Más cerca de ti.",
  },
  mark: {
    src: "/brand/logo-mark.png",
    width: 256,
    height: 256,
    alt: "Automoción OS",
  },
} as const;
