import type { NextAuthConfig } from "next-auth";
import { env } from "@/config/env";
import { isBackOfficeRole, type Role } from "../domain/permissions";

/**
 * Configuración base de Auth.js, SEGURA PARA EL EDGE.
 *
 * El middleware corre en el runtime edge, donde Prisma no existe. Por eso la
 * configuración se parte en dos: aquí van las piezas sin base de datos
 * (callbacks, páginas, guard de rutas), y `auth.ts` añade el adaptador y el
 * proveedor de credenciales para el runtime de Node.
 *
 * Sin esta separación el middleware no puede envolver la petición, y el guard
 * de /admin se queda solo en el layout.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  ...(env.AUTH_SECRET !== undefined ? { secret: env.AUTH_SECRET } : {}),
  trustHost: true,

  pages: { signIn: "/es/login", error: "/es/login" },

  // Los proveedores se añaden en auth.ts: `authorize` necesita la base de datos.
  providers: [],

  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: Role }).role;
        token.locale = (user as { locale?: string }).locale;
      }
      return token;
    },

    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.locale = token.locale as string;
      }
      return session;
    },

    /**
     * Guard de rutas del back-office.
     *
     * La ruta llega ya normalizada por Next. Se compara sobre segmentos, no con
     * una expresión sobre la cadena completa: `/es/administracion` no debe
     * confundirse con `/es/admin`, y `//admin` o `/ES/Admin` no deben colarse.
     */
    authorized: ({ auth: session, request }) => {
      const segments = request.nextUrl.pathname
        .toLowerCase()
        .split("/")
        .filter(Boolean);

      const withoutLocale =
        segments[0] === "es" || segments[0] === "en" ? segments.slice(1) : segments;

      if (withoutLocale[0] !== "admin") return true;

      const role = session?.user?.role;
      return role !== undefined && isBackOfficeRole(role);
    },
  },
} satisfies NextAuthConfig;
