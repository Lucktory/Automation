/**
 * API pública del módulo de identidad — PARTE DE SERVIDOR.
 *
 * Todo lo que depende de Auth.js, y por tanto de Next. Solo lo importan las
 * rutas, los layouts y las acciones de servidor.
 *
 * Lo puro —permisos, casos de uso de usuarios— está en `@/modules/identity` y
 * se puede importar desde cualquier sitio, incluidas las pruebas, sin arrastrar
 * el framework.
 */

export { auth, handlers, signIn, signOut } from "./infra/auth";
export {
  currentUser,
  requirePermission,
  UnauthorizedError,
  type SessionUser,
} from "./application/session";

/**
 * Fábrica del transporte de correo.
 *
 * Se expone por el punto de entrada de servidor y no por `index.ts` porque
 * arrastra el adaptador concreto (Resend), que no puede viajar al navegador ni
 * a las pruebas del dominio.
 */
export { createMailer } from "./infra/mailers";
export type { Mail, Mailer } from "./domain/mailer";
