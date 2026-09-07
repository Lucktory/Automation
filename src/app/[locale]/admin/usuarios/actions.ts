"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { usersDeps } from "@/composition/container";
import {
  changeUserRole,
  inviteUser,
  ROLES,
  setUserStatus,
  UserOperationError,
} from "@/modules/identity";
import { requirePermission } from "@/modules/identity/server";

/**
 * Acciones de /admin/usuarios.
 *
 * Cada una comprueba `users.write` antes de tocar nada. El middleware protege
 * la RUTA, pero una acción de servidor se puede invocar por su id sin pasar por
 * ella: la autorización va donde se ejecuta el efecto.
 *
 * Los errores de negocio (`UserOperationError`) se devuelven como código para
 * que la interfaz los traduzca. Nunca se filtra el mensaje interno.
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; errorCode: string };

const RoleEnum = z.enum(ROLES);

const InviteInput = z.object({
  email: z.string().email(),
  role: RoleEnum,
});

const BulkInput = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

function toResult(error: unknown): ActionResult {
  if (error instanceof UserOperationError) {
    return { ok: false, errorCode: error.code };
  }
  throw error;
}

export async function inviteUserAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("users.write");

  const parsed = InviteInput.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, errorCode: "INVALID" };

  try {
    await inviteUser(usersDeps, { ...parsed.data, actorId: user.id });
    revalidatePath("/admin/usuarios");
    return { ok: true, message: parsed.data.email };
  } catch (error) {
    return toResult(error);
  }
}

export async function changeRoleAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("users.write");

  const parsed = BulkInput.extend({ role: RoleEnum }).safeParse({
    ids: formData.getAll("ids").map(String),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, errorCode: "INVALID" };

  try {
    await changeUserRole(usersDeps, { ...parsed.data, actorId: user.id });
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function suspendUsersAction(formData: FormData): Promise<ActionResult> {
  return setStatusAction(formData, "SUSPENDED");
}

/** Reactivar es la inversa exacta de suspender, así que comparte camino. */
export async function reactivateUsersAction(formData: FormData): Promise<ActionResult> {
  return setStatusAction(formData, "ACTIVE");
}

async function setStatusAction(
  formData: FormData,
  status: "SUSPENDED" | "ACTIVE",
): Promise<ActionResult> {
  const user = await requirePermission("users.write");

  const parsed = BulkInput.safeParse({ ids: formData.getAll("ids").map(String) });
  if (!parsed.success) return { ok: false, errorCode: "INVALID" };

  try {
    await setUserStatus(usersDeps, { ids: parsed.data.ids, status, actorId: user.id });
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
