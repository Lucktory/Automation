import { messages } from "@/messages";
import type { Locale } from "./routing";

/**
 * Busca una clave que PUEDE no existir, sin inventar nada.
 *
 * Hace falta porque `t("...")` de next-intl nunca lanza aquí: `onError` está
 * configurado para no romper la página, así que una clave ausente devuelve el
 * centinela `⟨namespace.clave⟩`. Eso significa que un `try/catch` alrededor de
 * `t()` no atrapa nada y el centinela termina impreso en pantalla — que es
 * exactamente lo que pasó con las notas legales de las etapas dinámicas.
 *
 * Las etapas de destino las crea el administrador (`DESTINATION.ANLA_CEPD`,
 * `DESTINATION.INLAND_BUN_BOG`…), así que es NORMAL que no tengan nota
 * traducida. Lo correcto es no mostrar nota, no mostrar un símbolo raro.
 *
 * Devuelve `null` cuando la clave no existe o no resuelve a texto.
 */
export function optionalMessage(locale: Locale, path: string): string | null {
  const parts = path.split(".");
  let node: unknown = messages[locale];

  for (const part of parts) {
    if (typeof node !== "object" || node === null || !(part in node)) return null;
    node = (node as Record<string, unknown>)[part];
  }

  return typeof node === "string" ? node : null;
}
