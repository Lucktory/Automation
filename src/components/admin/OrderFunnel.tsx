import clsx from "clsx";

/**
 * Embudo de pedidos.
 *
 * Una barra segmentada donde el ANCHO de cada tramo es proporcional a cuántos
 * pedidos hay en esa etapa. No son siete bloques iguales: si cinco de ocho
 * pedidos están en tránsito, ese tramo ocupa la mitad de la barra y se ve de un
 * vistazo dónde está atascada la operación.
 *
 * Las etapas vacías conservan un ancho mínimo para no desaparecer: una etapa
 * que se esfuma cuando llega a cero hace creer que dejó de existir, y su
 * ausencia es justamente el dato interesante.
 *
 * La escala de color va de oscuro a claro siguiendo el avance, de modo que la
 * dirección del proceso se lee sin leer las etiquetas.
 */

export interface FunnelSegment {
  key: string;
  label: string;
  count: number;
}

/** Del más oscuro (recién confirmado) al más claro (entregado). */
const TONES = [
  "bg-[#0f5f6b]",
  "bg-[#14808a]",
  "bg-[#1b8fd6]",
  "bg-[#5cb3e8]",
  "bg-[#9fbccd]",
  "bg-[#c3ccd7]",
  "bg-[#dfe5eb]",
] as const;

const MIN_SHARE = 6;

export function OrderFunnel({ segments }: { segments: readonly FunnelSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  // Con todo en cero se reparte igual: la barra sigue explicando el proceso.
  const shares = segments.map((segment) =>
    total === 0 ? 100 / segments.length : Math.max(MIN_SHARE, (segment.count / total) * 100),
  );
  const scale = 100 / shares.reduce((sum, share) => sum + share, 0);

  return (
    <div>
      <div className="flex gap-1">
        {segments.map((segment, index) => (
          <div key={segment.key} style={{ width: `${shares[index]! * scale}%` }}>
            <p
              className={clsx(
                "mb-2 text-center font-display text-lg font-semibold",
                segment.count === 0 ? "text-text-muted/50" : "text-text-primary",
              )}
              data-numeric
            >
              {segment.count}
            </p>
            <div
              className={clsx("h-2.5 rounded-tile", TONES[index % TONES.length])}
              aria-hidden
            />
            <p className="mt-2 text-center text-[0.6875rem] leading-tight text-text-secondary">
              {segment.label}
            </p>
          </div>
        ))}
      </div>

      <p className="sr-only">
        {segments.map((segment) => `${segment.label}: ${segment.count}`).join(", ")}
      </p>
    </div>
  );
}
