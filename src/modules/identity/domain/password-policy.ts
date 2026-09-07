/**
 * Política de contraseñas.
 *
 * Un solo sitio para la regla, porque la aplican tres: la validación del
 * servidor en el registro, la del restablecimiento, y el medidor de fuerza que
 * ve el usuario mientras escribe. Si divergen, el medidor dice "segura" sobre
 * una contraseña que el servidor rechaza.
 *
 * No puede vivir en un archivo `"use server"`: esos solo exportan funciones
 * asíncronas.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const STRONG_PASSWORD_LENGTH = 12;
export const BCRYPT_COST = 12;

/** 0-4. Longitud y variedad. No se guarda ni se envía a ningún sitio. */
export function passwordStrength(value: string): number {
  if (value.length === 0) return 0;

  let score = 0;
  if (value.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (value.length >= STRONG_PASSWORD_LENGTH) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1;
  return score;
}
