import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import type { AccountPorts } from "../application/account";
import { BCRYPT_COST } from "../domain/password-policy";

/**
 * Adaptadores de registro y recuperación.
 *
 * Los tokens se guardan HASHEADOS con SHA-256. Quien lea `verification_tokens`
 * ve un hash, no un enlace utilizable: filtrar la tabla no basta para tomar una
 * cuenta. El token en claro solo existe en el correo.
 */

const TOKEN_BYTES = 32;

export function createAccountPorts(
  db: PrismaClient,
  deps: Pick<AccountPorts, "users" | "mailer">,
): AccountPorts {
  return {
    users: deps.users,
    mailer: deps.mailer,

    tokens: {
      create: async (identifier, tokenHash, expires) => {
        await db.verificationToken.create({
          data: { identifier, token: tokenHash, expires },
        });
      },

      /**
       * Consume el token: lo borra y dice si era válido y estaba vigente.
       *
       * El borrado y la comprobación van juntos a propósito — un token de un
       * solo uso que se comprueba y se borra en dos pasos se puede usar dos
       * veces si llegan dos peticiones a la vez.
       */
      consume: async (tokenHash) => {
        const row = await db.verificationToken.findUnique({ where: { token: tokenHash } });
        if (!row) return null;

        // Se borra SIEMPRE que exista, aunque esté caducado: un token gastado no
        // debe quedar en la tabla esperando a que alguien lo reintente.
        const { count } = await db.verificationToken.deleteMany({
          where: { token: tokenHash },
        });

        if (count === 0) return null;
        return row.expires.getTime() > Date.now() ? row.identifier : null;
      },

      deleteAllFor: async (identifier) => {
        await db.verificationToken.deleteMany({ where: { identifier } });
      },
    },

    passwords: {
      hash: (plain) => bcrypt.hash(plain, BCRYPT_COST),
      setFor: async (userId, hash) => {
        await db.user.update({ where: { id: userId }, data: { passwordHash: hash } });
      },
    },

    crypto: {
      randomToken: () => randomBytes(TOKEN_BYTES).toString("base64url"),
      hashToken: (token) => createHash("sha256").update(token).digest("hex"),
    },

    clock: { now: () => new Date() },
  };
}
