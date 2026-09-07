"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/modules/identity/server";

/**
 * Inicio de sesión.
 *
 * Devuelve un único mensaje de error para cualquier fallo de credenciales: no
 * se distingue "el correo no existe" de "la contraseña es incorrecta", porque
 * distinguirlos permite enumerar qué correos están registrados.
 */

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  redirectTo: z.string().startsWith("/").default("/es/admin"),
});

export type LoginState = { error: string | null };

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) return { error: "invalid" };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.redirectTo,
    });
    return { error: null };
  } catch (error) {
    // `signIn` lanza un redirect en el camino feliz; hay que dejarlo pasar.
    if (error instanceof AuthError) return { error: "invalid" };
    throw error;
  }
}
