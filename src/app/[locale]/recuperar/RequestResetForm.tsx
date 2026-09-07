"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { requestResetAction, type RequestState } from "./actions";

const INITIAL: RequestState = { status: "idle", email: null, error: null };

export function RequestResetForm({
  locale,
  minutes,
  labels,
}: {
  locale: string;
  minutes: number;
  labels: {
    email: string;
    emailPlaceholder: string;
    submit: string;
    back: string;
    sentTitle: string;
    sentBody: string;
    resend: string;
    invalid: string;
  };
}) {
  const [state, formAction, pending] = useActionState(requestResetAction, INITIAL);

  // "Enviado" se muestra siempre, exista la cuenta o no: es lo que impide usar
  // este formulario para averiguar qué correos están registrados.
  if (state.status === "sent") {
    return (
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-full bg-success/12 text-success"
        >
          <Mail size={22} />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-text-primary">
            {labels.sentTitle}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {labels.sentBody
              .replace("{email}", state.email ?? "")
              .replace("{minutes}", String(minutes))}
          </p>
        </div>

        <form action={formAction} className="w-full">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="email" value={state.email ?? ""} />
          <Button type="submit" disabled={pending} className="w-full">
            {labels.resend}
          </Button>
        </form>

        <Link
          href={`/${locale}/login`}
          className="text-[0.8125rem] text-primary hover:underline"
        >
          {labels.back}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

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
            placeholder={labels.emailPlaceholder}
            className="w-full rounded-control border border-border bg-bg py-2 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-muted"
          />
        </span>
      </label>

      {state.error && (
        <p role="alert" className="text-[0.8125rem] text-danger">
          {labels.invalid}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {labels.submit}
      </Button>

      <Link
        href={`/${locale}/login`}
        className="text-center text-[0.8125rem] text-primary hover:underline"
      >
        {labels.back}
      </Link>
    </form>
  );
}
