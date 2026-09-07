import type { Mailer } from "../domain/mailer";
import { passwordResetMail } from "../domain/mailer";
import type { UserRepository } from "../domain/user-ports";

/**
 * Registro y recuperación de contraseña.
 *
 * Dos reglas de seguridad gobiernan este archivo:
 *
 * 1. **Nunca se revela si un correo está registrado.** Ni el registro ni la
 *    recuperación cambian su respuesta según eso. Un formulario que responde
 *    "ese correo no existe" es un enumerador de cuentas gratuito.
 * 2. **Los tokens se guardan hasheados.** Quien lea la tabla no puede usarlos.
 */

export const RESET_TOKEN_TTL_MINUTES = 30;

export interface AccountPorts {
  users: UserRepository;
  mailer: Mailer;
  tokens: {
    create(identifier: string, tokenHash: string, expires: Date): Promise<void>;
    /**
     * Consume el token y devuelve a quién pertenece, o null si no vale.
     *
     * Devolver el identificador —en vez de recibirlo— es lo que permite que el
     * enlace del correo lleve SOLO el token. Meter el correo en la URL lo filtra
     * al historial del navegador, al `Referer` y a los registros del servidor.
     */
    consume(tokenHash: string): Promise<string | null>;
    deleteAllFor(identifier: string): Promise<void>;
  };
  passwords: {
    hash(plain: string): Promise<string>;
    setFor(userId: string, hash: string): Promise<void>;
  };
  /** Aleatoriedad y hash del token, inyectados para poder probarlos. */
  crypto: {
    randomToken(): string;
    hashToken(token: string): string;
  };
  clock: { now(): Date };
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  locale: string;
  consentVersion: string;
}

/**
 * Registro público. Siempre crea un CLIENTE: los roles del back-office solo se
 * otorgan por invitación desde /admin/usuarios.
 */
export async function registerCustomer(
  ports: AccountPorts,
  input: RegisterInput,
): Promise<{ created: boolean }> {
  const existing = await ports.users.byEmail(input.email);

  // Respuesta idéntica exista o no la cuenta. Quien ya está registrado recibe
  // un correo diciéndoselo; quien no, la cuenta. El formulario no distingue.
  if (existing) {
    await ports.mailer.send({
      to: input.email,
      subject: "Ya tienes una cuenta en Automoción OS",
      body: "Alguien intentó registrarse con este correo. Si fuiste tú, inicia sesión o restablece tu contraseña.",
    });
    return { created: false };
  }

  await ports.users.createCustomer({
    email: input.email,
    name: input.name,
    phone: input.phone,
    passwordHash: await ports.passwords.hash(input.password),
    locale: input.locale,
    consentVersion: input.consentVersion,
    consentAt: ports.clock.now(),
  });

  return { created: true };
}

/**
 * Solicita el restablecimiento. Devuelve void a propósito: la interfaz muestra
 * "revisa tu correo" siempre, exista la cuenta o no.
 */
export async function requestPasswordReset(
  ports: AccountPorts,
  options: { email: string; locale: string; baseUrl: string },
): Promise<void> {
  const user = await ports.users.byEmail(options.email);
  if (!user || user.status === "SUSPENDED" || user.status === "DELETED") return;

  // Un solo enlace válido a la vez: pedir otro invalida el anterior.
  await ports.tokens.deleteAllFor(user.email);

  const token = ports.crypto.randomToken();
  const expires = new Date(
    ports.clock.now().getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
  );
  await ports.tokens.create(user.email, ports.crypto.hashToken(token), expires);

  await ports.mailer.send(
    passwordResetMail({
      to: user.email,
      resetUrl: `${options.baseUrl}/${options.locale}/recuperar/${token}`,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      locale: options.locale,
    }),
  );
}

export type ResetOutcome = "OK" | "INVALID_TOKEN";

export async function completePasswordReset(
  ports: AccountPorts,
  options: { token: string; newPassword: string },
): Promise<ResetOutcome> {
  const email = await ports.tokens.consume(ports.crypto.hashToken(options.token));
  if (email === null) return "INVALID_TOKEN";

  const user = await ports.users.byEmail(email);
  if (!user) return "INVALID_TOKEN";

  const hash = await ports.passwords.hash(options.newPassword);
  await ports.passwords.setFor(user.id, hash);

  // Restablecer reactiva una cuenta invitada: el enlace prueba el correo.
  if (user.status === "INVITED") {
    await ports.users.setStatus([user.id], "ACTIVE");
  }

  return "OK";
}

