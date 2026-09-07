"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import type { PillTone } from "@/config/role-display";
import { inviteUserAction } from "./actions";

export interface RoleOption {
  value: string;
  label: string;
  hint: string;
  tone: PillTone;
}

const RING: Record<PillTone, string> = {
  success: "border-success",
  warning: "border-warning",
  danger: "border-danger",
  info: "border-info",
  primary: "border-primary",
  muted: "border-border-strong",
};

/**
 * Panel de invitación.
 *
 * Se abre como cajón lateral, igual que en el diseño aprobado, con un velo
 * detrás. Ese velo no es adorno: sin él, en pantallas anchas el panel flota
 * sobre una tabla que sigue pareciendo interactiva.
 */
export function InvitePanel({
  roles,
  labels,
}: {
  roles: readonly RoleOption[];
  labels: {
    trigger: string;
    title: string;
    subtitle: string;
    email: string;
    emailPlaceholder: string;
    role: string;
    cancel: string;
    send: string;
    sent: string;
    close: string;
    errors: Record<string, string>;
  };
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await inviteUserAction(formData);
    setPending(false);
    if (result.ok) {
      setSent(result.message ?? null);
      setOpen(false);
    } else {
      setError(labels.errors[result.errorCode] ?? labels.errors.INVALID ?? null);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {labels.trigger}
      </Button>

      {sent && !open && (
        <p role="status" className="mt-2 text-[0.8125rem] text-success">
          {labels.sent.replace("{email}", sent)}
        </p>
      )}

      <div
        className={clsx("fixed inset-0 z-50", open ? "" : "pointer-events-none")}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label={labels.close}
          onClick={() => setOpen(false)}
          className={clsx(
            "absolute inset-0 bg-bg/70 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          role="dialog"
          aria-modal={open}
          aria-label={labels.title}
          className={clsx(
            "absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-border bg-surface-elevated transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <h2 className="font-display text-lg font-semibold text-text-primary">
                {labels.title}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-text-muted">{labels.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={labels.close}
              className="rounded-control p-1 text-text-muted hover:text-text-primary"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <form action={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-text-secondary">{labels.email}</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder={labels.emailPlaceholder}
                  className="rounded-control border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                />
              </label>

              <fieldset className="mt-6">
                <legend className="text-sm text-text-secondary">{labels.role}</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {roles.map((role, index) => (
                    <label
                      key={role.value}
                      className="flex cursor-pointer items-start gap-3 rounded-control border border-border bg-surface p-3 hover:border-border-strong has-checked:border-primary"
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        defaultChecked={index === 0}
                        className={clsx("mt-0.5 size-4 shrink-0 border-2", RING[role.tone])}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm text-text-primary">{role.label}</span>
                        <span className="block text-[0.8125rem] text-text-muted">
                          {role.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {error && (
                <p role="alert" className="mt-4 text-[0.8125rem] text-danger">
                  {error}
                </p>
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-5">
              <Button type="button" onClick={() => setOpen(false)}>
                {labels.cancel}
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {labels.send}
              </Button>
            </footer>
          </form>
        </aside>
      </div>
    </>
  );
}
