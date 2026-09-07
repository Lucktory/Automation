import { handlers } from "@/modules/identity/server";

/**
 * Punto de entrada HTTP de Auth.js.
 *
 * Vive fuera de `[locale]` a propósito: el matcher del middleware excluye
 * `/api`, y estas rutas no son contenido traducible. Sin este archivo,
 * `signIn()` no tiene a dónde enviar las credenciales.
 */
export const { GET, POST } = handlers;
