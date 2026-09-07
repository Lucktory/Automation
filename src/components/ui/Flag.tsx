/**
 * Banderas como SVG en línea.
 *
 * NO se usan emoji de bandera. Los indicadores regionales de Unicode (🇨🇴) no
 * se dibujan en Windows: el sistema no trae las glifos de bandera y el
 * navegador acaba mostrando el par de letras «CO» o un recuadro vacío. En una
 * pantalla que se demuestra a un cliente, un chip que debía llevar bandera y
 * lleva dos letras sueltas parece un error, y lo es.
 *
 * Cada bandera es un registro, no una rama: agregar un mercado es agregar una
 * entrada aquí. Son versiones simplificadas a propósito —se dibujan a 18×12
 * píxeles, donde el detalle heráldico no se distingue— pero conservan lo que
 * las hace reconocibles a ese tamaño: la disposición y el color.
 */

const RATIO = { width: 18, height: 12 } as const;

/** Estrella de cinco puntas centrada en (cx, cy) con radio r. */
function star(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  const SPIKES = 5;
  const INNER = 0.382; // razón áurea inversa: la estrella clásica de 5 puntas
  for (let index = 0; index < SPIKES * 2; index += 1) {
    const radius = index % 2 === 0 ? r : r * INNER;
    const angle = (Math.PI / SPIKES) * index - Math.PI / 2;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(" ");
}

const FLAGS: Record<string, React.ReactNode> = {
  US: (
    <>
      <rect width="18" height="12" fill="#b22234" />
      {[1, 3, 5, 7, 9].map((row) => (
        <rect key={row} y={row * 1.2} width="18" height="1.2" fill="#fff" />
      ))}
      <rect width="8" height="6.6" fill="#3c3b6e" />
    </>
  ),
  CN: (
    <>
      <rect width="18" height="12" fill="#ee1c25" />
      <polygon points={star(4, 4, 2.4)} fill="#ffde00" />
      <polygon points={star(8.2, 1.8, 0.9)} fill="#ffde00" />
      <polygon points={star(9.6, 3.6, 0.9)} fill="#ffde00" />
      <polygon points={star(9.6, 5.8, 0.9)} fill="#ffde00" />
      <polygon points={star(8.2, 7.4, 0.9)} fill="#ffde00" />
    </>
  ),
  AE: (
    <>
      <rect width="18" height="4" fill="#00732f" />
      <rect y="4" width="18" height="4" fill="#fff" />
      <rect y="8" width="18" height="4" fill="#000" />
      <rect width="4.5" height="12" fill="#ff0000" />
    </>
  ),
  EU: (
    <>
      <rect width="18" height="12" fill="#003399" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (Math.PI / 6) * index - Math.PI / 2;
        return (
          <polygon
            key={index}
            points={star(9 + 3.6 * Math.cos(angle), 6 + 3.6 * Math.sin(angle), 0.75)}
            fill="#ffcc00"
          />
        );
      })}
    </>
  ),
  CA: (
    <>
      <rect width="18" height="12" fill="#fff" />
      <rect width="4.5" height="12" fill="#d52b1e" />
      <rect x="13.5" width="4.5" height="12" fill="#d52b1e" />
      {/* Hoja de arce estilizada: a 12 px de alto solo se lee la silueta. */}
      <path
        d="M9 2.2 8.2 4.1 6.6 3.4 7.1 5.4 5.8 5.6 7.4 6.9 6.9 7.9 8.6 7.6 8.5 9.8h1l-.1-2.2 1.7.3-.5-1 1.6-1.3-1.3-.2.5-2-1.6.7z"
        fill="#d52b1e"
      />
    </>
  ),

  // --- Países de FABRICACIÓN presentes en el catálogo ----------------------
  // El chip de origen muestra dónde se fabricó la unidad, que es lo que decide
  // el tratado y por tanto el arancel. No es la nacionalidad de la marca: un
  // Volvo ensamblado en Bélgica entra como belga, no como sueco, y el motor
  // liquida con esa bandera aunque el logotipo diga otra cosa.
  KR: (
    <>
      <rect width="18" height="12" fill="#fff" />
      <path d="M9 3.4a2.6 2.6 0 000 5.2 2.6 2.6 0 010-5.2z" fill="#cd2e3a" />
      <path d="M9 3.4a2.6 2.6 0 010 5.2 2.6 2.6 0 000-5.2z" fill="#0047a0" />
      <rect x="2.2" y="2.6" width="2.6" height="0.5" transform="rotate(33 3.5 2.8)" />
      <rect x="13.2" y="8.9" width="2.6" height="0.5" transform="rotate(33 14.5 9.1)" />
    </>
  ),
  JP: (
    <>
      <rect width="18" height="12" fill="#fff" />
      <circle cx="9" cy="6" r="3.4" fill="#bc002d" />
    </>
  ),
  BE: (
    <>
      <rect width="6" height="12" fill="#141414" />
      <rect x="6" width="6" height="12" fill="#fdda25" />
      <rect x="12" width="6" height="12" fill="#ef3340" />
    </>
  ),
  DE: (
    <>
      <rect width="18" height="4" fill="#141414" />
      <rect y="4" width="18" height="4" fill="#dd0000" />
      <rect y="8" width="18" height="4" fill="#ffce00" />
    </>
  ),
  SE: (
    <>
      <rect width="18" height="12" fill="#006aa7" />
      <rect x="5" width="2.4" height="12" fill="#fecc00" />
      <rect y="4.8" width="18" height="2.4" fill="#fecc00" />
    </>
  ),
};

export function Flag({ code, className }: { code: string; className?: string }) {
  const shape = FLAGS[code];
  if (!shape) return null;

  return (
    <svg
      viewBox={`0 0 ${RATIO.width} ${RATIO.height}`}
      width={RATIO.width}
      height={RATIO.height}
      aria-hidden
      focusable="false"
      className={className}
    >
      {shape}
    </svg>
  );
}

export const HAS_FLAG = (code: string) => code in FLAGS;
