"use server";

import { z } from "zod";
import { accountPorts } from "@/composition/container";
import { MIN_PASSWORD_LENGTH, registerCustomer } from "@/modules/identity";

/**
 * Registro público.
 *
 * Devuelve SIEMPRE el mismo resultado, exista o no la cuenta. Distinguirlos
 * convertiría el formulario en un enumerador de correos registrados.
 */

const CONSENT_VERSION = "v1";

const RegisterInputSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  // Se normaliza a E.164 colombiano: la base guarda +573001234567.
  phone: z
    .string()
    .min(7)
    .max(20)
    .transform((raw) => `+57${raw.replace(/\D/g, "").replace(/^57/, "")}`),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
  consent: z.literal("on"),
  locale: z.string().min(2).max(5),
});

export type RegisterState = { status: "idle" | "done"; error: string | null };

export async function registerAction(
  _previous: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = RegisterInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    consent: formData.get("consent"),
    locale: formData.get("locale"),
  });

  if (!parsed.success) {
    const tooShort = parsed.error.issues.some(
      (issue) => issue.path[0] === "password" && issue.code === "too_small",
    );
    return { status: "idle", error: tooShort ? "weakPassword" : "invalid" };
  }

  await registerCustomer(accountPorts, {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    password: parsed.data.password,
    locale: parsed.data.locale,
    consentVersion: CONSENT_VERSION,
  });

  return { status: "done", error: null };
}
