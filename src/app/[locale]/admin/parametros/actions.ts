"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parametersDeps } from "@/composition/container";
import { requirePermission } from "@/modules/identity/server";
import {
  ensureDraft,
  publishDraft,
  updateTariffRule,
  type TariffRuleDraft,
} from "@/modules/parameters";

/**
 * Acciones de servidor de /admin/parametros.
 *
 * Cada una comprueba su permiso ANTES de hacer nada. El middleware protege la
 * ruta, pero una acción de servidor se puede invocar directamente por su id: la
 * autorización tiene que estar donde se ejecuta el efecto, no solo donde se
 * pinta el botón.
 *
 * Ninguna escritura toca el conjunto ACTIVO. `ensureDraft` clona primero, para
 * que cambiar una tarifa no mueva el precio de las cotizaciones en vuelo.
 */

const RATE = z.coerce.number().min(0).max(1);

const UpdateRateInput = z.object({
  ruleId: z.string().min(1),
  dutyRate: RATE.optional(),
  vatRate: RATE.optional(),
  exciseRate: RATE.optional(),
  reason: z.string().max(500).optional(),
});

export async function updateTariffRateAction(formData: FormData) {
  const user = await requirePermission("parameters.write");

  const parsed = UpdateRateInput.safeParse({
    ruleId: formData.get("ruleId"),
    dutyRate: formData.get("dutyRate") ?? undefined,
    vatRate: formData.get("vatRate") ?? undefined,
    exciseRate: formData.get("exciseRate") ?? undefined,
    reason: formData.get("reason") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { ruleId, reason, ...rates } = parsed.data;

  // `exactOptionalPropertyTypes` distingue "ausente" de "presente y undefined".
  // El parche solo lleva lo que el operador realmente cambió.
  const patch: Partial<TariffRuleDraft> = {};
  if (rates.dutyRate !== undefined) patch.dutyRate = rates.dutyRate;
  if (rates.vatRate !== undefined) patch.vatRate = rates.vatRate;
  if (rates.exciseRate !== undefined) patch.exciseRate = rates.exciseRate;

  // `updateTariffRule` se encarga de asegurar el borrador Y de resolver la
  // regla equivalente dentro de él. Clonar aquí y actualizar por el id del
  // formulario escribía en el conjunto ACTIVO.
  await updateTariffRule(parametersDeps, {
    ruleId,
    patch,
    authorId: user.id,
    ...(reason !== undefined ? { reason } : {}),
  });

  revalidatePath("/admin/parametros");
  return { ok: true as const };
}

export async function createDraftAction() {
  const user = await requirePermission("parameters.write");
  const draft = await ensureDraft(parametersDeps, user.id);
  revalidatePath("/admin/parametros");
  return { ok: true as const, version: draft.version };
}

export async function publishDraftAction(formData: FormData) {
  // Publicar está deliberadamente más restringido que editar: cambiar una
  // tarifa en un borrador es trabajo diario; activarla mueve el precio de
  // todas las cotizaciones nuevas.
  const user = await requirePermission("parameters.publish");

  const draftId = z.string().min(1).safeParse(formData.get("draftId"));
  if (!draftId.success) {
    return { ok: false as const, error: "Falta el identificador del borrador" };
  }

  const published = await publishDraft(parametersDeps, {
    draftId: draftId.data,
    authorId: user.id,
  });

  revalidatePath("/admin/parametros");
  return { ok: true as const, version: published.version };
}

/**
 * Envoltura para `<form action=...>`, que exige una acción sin valor de
 * retorno. La versión tipada de arriba sigue disponible para llamadas
 * programáticas que sí quieren leer el resultado.
 */
export async function publishDraftFormAction(formData: FormData): Promise<void> {
  await publishDraftAction(formData);
}
