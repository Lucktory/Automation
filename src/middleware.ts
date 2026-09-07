import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { authConfig } from "@/modules/identity/infra/auth.config";
import { routing } from "@/i18n/routing";

/**
 * Middleware: idioma y autorización, en ese orden.
 *
 *   1. Auth.js envuelve la petición y evalúa el callback `authorized`, que
 *      bloquea /admin para quien no tenga acceso al back-office.
 *   2. Si pasa, next-intl resuelve el idioma y reescribe la URL.
 *
 * Se usa `authConfig` —la mitad sin base de datos— porque esto corre en el
 * runtime edge, donde Prisma no existe.
 *
 * El layout de /admin repite la comprobación a propósito: proteger la RUTA y
 * proteger el punto donde se leen los datos son capas distintas, y una server
 * action puede invocarse sin pasar por ninguna ruta.
 */

const intlMiddleware = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

export default auth((request) => intlMiddleware(request));

export const config = {
  matcher: ["/", "/(es|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
