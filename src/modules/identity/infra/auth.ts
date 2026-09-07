import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/infra/db/prisma";
import { authConfig } from "./auth.config";

/**
 * Auth.js para el runtime de Node.
 *
 * Toma la configuración base —compartida con el middleware, que corre en el
 * edge— y le añade lo que necesita base de datos: el adaptador de Prisma y el
 * proveedor de credenciales.
 *
 * Estrategia JWT porque el proveedor de credenciales no admite sesiones en
 * base de datos. El rol viaja en el token para que el middleware pueda decidir
 * el acceso al back-office sin consultar la base en cada petición.
 */

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),

  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        // Mismo camino de fallo para "no existe" y "contraseña incorrecta": no
        // se filtra qué correos están registrados.
        if (!user?.passwordHash) return null;
        if (user.status !== "ACTIVE") return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          locale: user.locale,
        };
      },
    }),
  ],
});
