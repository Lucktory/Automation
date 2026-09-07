"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { accountPorts } from "@/composition/container";
import {
  completePasswordReset,
  MIN_PASSWORD_LENGTH,
  requestPasswordReset,
} from "@/modules/identity";

/**
 * Recuperación de contraseña.
 *
 * `requestReset` NUNCA revela si el correo existe: la interfaz muestra "revisa
 * tu correo" en los dos casos. Es la misma razón por la que el inicio de sesión
 * da un solo mensaje de error.
 */

export type RequestState = { status: "idle" | "sent"; email: string | null; error: string | null };

const EmailSchema = z.object({ email: z.string().email(), locale: z.string().min(2).max(5) });

async function baseUrl(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function requestResetAction(
  _previous: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const parsed = EmailSchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return { status: "idle", email: null, error: "invalid" };

  await requestPasswordReset(accountPorts, {
    email: parsed.data.email,
    locale: parsed.data.locale,
    baseUrl: await baseUrl(),
  });

  // Siempre "enviado", exista la cuenta o no.
  return { status: "sent", email: parsed.data.email, error: null };
}

export type ResetState = { status: "idle" | "done"; error: string | null };

const ResetSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, { path: ["confirm"] });

export async function completeResetAction(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = ResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.path[0] === "confirm");
    return { status: "idle", error: mismatch ? "mismatch" : "weakPassword" };
  }

  const outcome = await completePasswordReset(accountPorts, {
    token: parsed.data.token,
    newPassword: parsed.data.password,
  });

  return outcome === "OK"
    ? { status: "done", error: null }
    : { status: "idle", error: "invalidToken" };
}
