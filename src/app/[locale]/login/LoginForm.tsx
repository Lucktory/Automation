"use client";

import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { loginAction, type LoginState } from "./actions";

const INITIAL: LoginState = { error: null };

/**
 * Formulario de acceso.
 *
 * Las etiquetas llegan traducidas por props: el componente no toca el catálogo
 * de mensajes, así que se puede probar sin montar el proveedor de i18n.
 */
export function LoginForm({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    email: string;
    password: string;
    submit: string;
    forgot: string;
    invalid: string;
    magicLink: string;
    or: string;
    noAccount: string;
    register: string;
    showPassword: string;
  };
}) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);
  const [revealed, setRevealed] = useState(false);
  const failed = state.error !== null;

  const field =
    "w-full rounded-control border bg-bg py-2 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-muted";

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="redirectTo" value={`/${locale}/admin/parametros`} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-secondary">{labels.email}</span>
        <span className="relative block">
          <Mail
            size={15}
            aria-hidden
            className="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
          />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="juan@ejemplo.com"
            className={`${field} border-border`}
          />
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-secondary">{labels.password}</span>
          <span className="relative block">
            <Lock
              size={15}
              aria-hidden
              className="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
            />
            <input
              name="password"
              type={revealed ? "text" : "password"}
              required
              autoComplete="current-password"
              aria-invalid={failed}
              aria-describedby={failed ? "login-error" : undefined}
              className={`${field} pr-10 ${failed ? "border-danger" : "border-border"}`}
            />
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={labels.showPassword}
              aria-pressed={revealed}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </span>
        </label>

        <div className="flex items-start justify-between gap-3">
          {failed ? (
            <p id="login-error" role="alert" className="text-[0.8125rem] text-danger">
              {labels.invalid}
            </p>
          ) : (
            <span />
          )}
          <Link
            href={`/${locale}/recuperar`}
            className="shrink-0 text-[0.8125rem] text-primary hover:underline"
          >
            {labels.forgot}
          </Link>
        </div>
      </div>

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {labels.submit}
      </Button>

      {/* El enlace mágico no está implementado: el proveedor de correo de
          Auth.js aún no está configurado. Se ofrece la recuperación de
          contraseña, que sí funciona de extremo a extremo, en vez de un botón
          que no responde. */}
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">{labels.or}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Link
        href={`/${locale}/recuperar`}
        className="inline-flex w-full items-center justify-center rounded-control border border-border-strong px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-elevated"
      >
        {labels.forgot}
      </Link>

      <p className="text-center text-[0.8125rem] text-text-muted">
        {labels.noAccount}{" "}
        <Link href={`/${locale}/registro`} className="text-primary hover:underline">
          {labels.register}
        </Link>
      </p>
    </form>
  );
}
