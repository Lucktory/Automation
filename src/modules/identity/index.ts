/**
 * API pública del módulo de identidad — PARTE PURA.
 *
 * Aquí no entra nada que arrastre Auth.js, Next o Prisma. Eso vive en
 * `@/modules/identity/server`.
 *
 * La separación no es estética: cuando ambas mitades compartían una sola
 * entrada, pedir `can()` —una función que solo consulta una matriz en memoria—
 * arrastraba Auth.js y `next/server` detrás. Se descubrió porque una prueba de
 * los casos de uso, que no toca red ni framework, no podía ni cargar el módulo.
 */

export {
  can,
  isBackOfficeRole,
  permissionsFor,
  PERMISSIONS,
  ROLES,
  type Permission,
  type Role,
} from "./domain/permissions";

export type {
  UserFilters,
  UserRepository,
  UserRow,
  UserStatus,
} from "./domain/user-ports";

export {
  changeUserRole,
  getUsersScreen,
  inviteUser,
  setUserStatus,
  UserOperationError,
  type UsersDeps,
  type UsersScreenData,
} from "./application/users-screen";

export {
  completePasswordReset,
  registerCustomer,
  requestPasswordReset,
  RESET_TOKEN_TTL_MINUTES,
  type AccountPorts,
  type RegisterInput,
  type ResetOutcome,
} from "./application/account";

export { passwordResetMail, type Mail, type Mailer } from "./domain/mailer";

export {
  BCRYPT_COST,
  MIN_PASSWORD_LENGTH,
  passwordStrength,
  STRONG_PASSWORD_LENGTH,
} from "./domain/password-policy";
