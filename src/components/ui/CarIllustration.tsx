/**
 * Ilustración de vehículo por carrocería.
 *
 * Existe porque el catálogo todavía no tiene fotografías, y la alternativa que
 * había —un mosaico con las tres primeras letras de la marca— es la señal más
 * clara de que una pantalla se generó en vez de diseñarse. Una silueta dibujada
 * dice lo mismo que una foto a este tamaño (qué clase de vehículo es) sin
 * fingir que conocemos el color ni la versión exacta.
 *
 * No es un relleno permanente: en cuanto haya filas en `VehicleImage` la ficha
 * usa la foto y esto desaparece solo, sin tocar el componente que la pinta.
 *
 * Cada silueta es un perfil lateral en un lienzo de 240×100. Se dibujan a mano
 * y no con una librería de iconos porque un icono de coche genérico no
 * distingue un sedán de una SUV, que es justo lo que el comprador está mirando.
 */

interface Silhouette {
  /** Contorno de la carrocería. */
  body: string;
  /** Cristales, en un tono más claro. */
  glass: string;
  /** Centro de las ruedas en el eje X. El eje Y y el radio son comunes. */
  axles: readonly [number, number];
}

const WHEEL_Y = 78;
const WHEEL_R = 15;

const SILHOUETTES: Record<string, Silhouette> = {
  // Sedán: capó largo, techo bajo, maletero marcado.
  SEDAN: {
    body:
      "M14 73c0-9 4-14 13-16l31-8 24-18c5-4 12-6 21-6h44c10 0 17 2 22 6l26 20 22 6c9 2 13 7 13 16v5c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass:
      "M92 34c4-3 9-5 15-5h11v17H79zM126 29h20c7 0 12 1 16 4l16 13h-52z",
    axles: [64, 180],
  },

  // SUV: mayor altura libre, techo alto y plano, voladizos cortos.
  SUV: {
    body:
      "M14 70c0-11 4-17 14-19l26-7 20-20c5-5 12-7 22-7h60c11 0 18 2 23 7l22 21 22 6c9 2 13 8 13 18v6c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass:
      "M84 30c4-4 10-6 17-6h13v20H70zM122 24h30c8 0 13 2 17 5l17 15h-64z",
    axles: [63, 181],
  },

  // Crossover: entre los dos — techo en cupé, altura de SUV.
  CROSSOVER: {
    body:
      "M14 72c0-10 4-16 13-18l29-7 22-19c5-5 12-7 21-7h50c10 0 17 2 22 7l25 21 22 6c9 2 13 7 13 17v5c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass:
      "M88 32c4-4 10-6 16-6h12v19H74zM124 26h26c7 0 12 2 16 5l17 14h-59z",
    axles: [64, 180],
  },

  // Hatchback: sin maletero, portón trasero casi vertical.
  HATCHBACK: {
    body:
      "M14 73c0-9 4-14 13-16l30-8 23-18c5-4 12-6 21-6h48c10 0 17 2 22 6l24 21 12 5c8 3 11 8 11 16v5c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass:
      "M90 34c4-3 9-5 15-5h11v17H77zM124 29h24c7 0 12 1 16 4l15 13h-55z",
    axles: [64, 176],
  },

  // Cupé: techo más bajo, luna trasera muy tumbada.
  COUPE: {
    body:
      "M14 74c0-8 4-13 12-15l34-9 26-17c5-4 12-6 20-6h38c10 0 17 2 22 7l30 25 20 5c8 2 12 7 12 15v4c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass:
      "M96 37c4-3 9-5 14-5h9v15H84zM127 32h18c6 0 11 2 15 5l17 15h-50z",
    axles: [66, 180],
  },

  // Pickup: cabina adelante, platón abierto detrás.
  PICKUP: {
    body:
      "M14 70c0-11 4-17 14-19l24-6 19-19c5-5 11-7 21-7h44c9 0 15 3 19 8l17 22h56c4 0 6 2 6 6v22c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass:
      "M82 30c4-4 10-6 17-6h11v20H68zM118 24h22c6 0 10 2 13 6l11 14h-46z",
    axles: [62, 186],
  },

  // Furgoneta: una caja con morro corto.
  VAN: {
    body:
      "M14 68c0-12 5-19 15-21l14-4 14-16c4-5 10-7 18-7h103c11 0 17 6 17 17v41c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass: "M74 26c3-4 8-6 15-6h14v20H58zM111 20h48v20h-48z",
    axles: [58, 182],
  },

  MINIVAN: {
    body:
      "M14 69c0-11 5-18 15-20l18-5 18-17c5-5 11-7 20-7h84c11 0 18 7 18 18v39c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass: "M80 28c4-4 9-6 16-6h12v19H64zM116 22h44v19h-44z",
    axles: [60, 180],
  },

  WAGON: {
    body:
      "M14 72c0-10 4-15 13-17l30-8 23-18c5-4 12-6 21-6h56c10 0 17 2 22 7l26 22 14 4c8 2 12 7 12 16v5c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass:
      "M90 33c4-3 9-5 15-5h11v17H77zM124 28h30c7 0 12 1 16 4l16 13h-62z",
    axles: [64, 180],
  },

  CONVERTIBLE: {
    body:
      "M14 74c0-8 4-13 12-15l36-9 24-13c5-3 11-4 19-4h40c9 0 16 2 21 6l28 20 20 5c8 2 12 7 12 15v5c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass: "M98 42h72l-14-11c-4-3-9-4-15-4h-30c-7 0-12 2-13 6z",
    axles: [66, 180],
  },

  TRUCK: {
    body:
      "M14 66c0-13 5-20 16-22l12-3 14-15c4-5 10-7 18-7h34c9 0 14 4 14 13v18h84c4 0 6 2 6 6v26c0 3-2 5-5 5H19c-3 0-5-2-5-5z",
    glass: "M76 26c3-4 8-6 15-6h13v18H62z",
    axles: [56, 190],
  },
};

/** Cuando la carrocería no está mapeada, el perfil más neutro del catálogo. */
const FALLBACK = "CROSSOVER";

export function CarIllustration({
  bodyType,
  className,
}: {
  bodyType: string;
  className?: string;
}) {
  const shape = SILHOUETTES[bodyType] ?? SILHOUETTES[FALLBACK]!;
  const [frontAxle, rearAxle] = shape.axles;

  return (
    <svg
      viewBox="0 0 240 100"
      className={className}
      role="img"
      aria-hidden
      focusable="false"
    >
      {/* Sombra de contacto: sin ella la silueta flota. */}
      <ellipse cx="120" cy="92" rx="104" ry="5" className="fill-black/25" />

      <path d={shape.body} className="fill-text-muted/35" />
      <path d={shape.glass} className="fill-bg/60" />

      {[frontAxle, rearAxle].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={WHEEL_Y} r={WHEEL_R} className="fill-bg" />
          <circle
            cx={cx}
            cy={WHEEL_Y}
            r={WHEEL_R - 1}
            className="fill-none stroke-text-muted/45"
            strokeWidth="2.5"
          />
          <circle cx={cx} cy={WHEEL_Y} r="5" className="fill-text-muted/35" />
        </g>
      ))}
    </svg>
  );
}
