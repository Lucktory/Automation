"use server";

import { z } from "zod";
import { prisma } from "@/infra/db/prisma";

/**
 * Registra un prospecto desde el formulario de contacto.
 *
 * Escribe una fila en `Lead`, que es donde el back-office los cuenta. No manda
 * correo todavía: lo que el negocio no puede perder es el CONTACTO, y una fila
 * guardada sobrevive a un proveedor de correo caído.
 *
 * Valida con Zod antes de tocar la base. El formulario es público y sin sesión,
 * así que es la única frontera donde el dato deja de ser texto de un extraño.
 */

const ContactInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().min(5).max(2000),
  locale: z.string().trim().max(5).default("es"),
});

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: "INVALID"; fields: string[] }
  | { ok: false; reason: "FAILED" };

export async function submitContact(formData: FormData): Promise<ContactResult> {
  const parsed = ContactInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    message: formData.get("message"),
    locale: formData.get("locale") ?? "es",
  });

  if (!parsed.success) {
    return {
      ok: false,
      reason: "INVALID",
      fields: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
    };
  }

  try {
    await prisma.lead.create({
      data: {
        source: "WEB_FORM",
        status: "NEW",
        name: parsed.data.name,
        email: parsed.data.email,
        ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
        message: parsed.data.message,
        locale: parsed.data.locale,
        // Consentimiento explícito: el formulario lo declara junto al botón.
        dataConsentAt: new Date(),
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "FAILED" };
  }
}
