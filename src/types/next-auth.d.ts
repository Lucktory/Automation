import type { Role } from "@/modules/identity";

/**
 * Extiende los tipos de Auth.js con el rol y el idioma.
 * Sin esto, `session.user.role` sería `any` y el guard del back-office
 * dependería de una aserción de tipo en lugar del compilador.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      locale: string;
    };
  }

  interface User {
    role?: Role;
    locale?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    locale?: string;
  }
}

export {};
