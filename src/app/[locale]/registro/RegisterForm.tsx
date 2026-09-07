"use client";

import { Mail, User } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { registerAction, type RegisterState } from "./actions";

const INITIAL: RegisterState = { status: "idle", error: null };

export function RegisterForm({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    password: string;
    showPassword: string;
    strength: { weak: string; fair: string; strong: string };
    consent: string;
    consentLink: string;
    consentLaw: string;
    submit: string;
    doneTitle: string;
    doneBody: string;
    signInHref: string;
    signIn: string;
    errors: Record<string, string>;
  };
}) {
  const [state, formAction, pending] = useActionState(registerAction, INITIAL);

  // Mismo acuse exista o no la cuenta: el formulario no revela qué correos
  // están registrados.
  if (state.status === "done") {
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
            {labels.doneTitle}
          </p>
          <p className="mt-2 text-sm text-text-secondary">{labels.doneBody}</p>
        </div>
        <Link
          href={labels.signInHref}
          className="text-[0.8125rem] text-primary hover:underline"
        >
          {labels.signIn}
        </Link>
      </div>
    );
  }

  const field =
    "w-full rounded-control border border-border bg-bg py-2 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-muted";

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-secondary">{labels.name}</span>
        <span className="relative block">
          <User
            size={15}
            aria-hidden
            className="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
          />
          <input
            name="name"
            required
            autoComplete="name"
            placeholder={labels.namePlaceholder}
            className={field}
          />
        </span>
      </label>

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
            className={field}
          />
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-secondary">{labels.phone}</span>
        {/* El prefijo +57 es fijo: el mercado es Colombia y así el número queda
            normalizado a E.164 sin pedirle formato a nadie. */}
        <span className="flex overflow-hidden rounded-control border border-border bg-bg">
          <span className="border-r border-border px-3 py-2 text-sm text-text-muted">
            +57
          </span>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel-national"
            placeholder={labels.phonePlaceholder}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </span>
      </label>

      <PasswordField
        name="password"
        label={labels.password}
        showLabel={labels.showPassword}
        autoComplete="new-password"
        invalid={state.error === "weakPassword"}
        strengthLabels={labels.strength}
      />

      {/* Habeas data: obligatorio por Ley 1581 de 2012, y por eso el formulario
          no puede enviarse sin él. */}
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
        />
        <span className="text-[0.8125rem] text-text-secondary">
          {labels.consent}{" "}
          <Link
            href={`/${locale}/legal/habeas-data`}
            className="text-primary hover:underline"
          >
            {labels.consentLink}
          </Link>{" "}
          {labels.consentLaw}
        </span>
      </label>

      {state.error && (
        <p role="alert" className="text-[0.8125rem] text-danger">
          {labels.errors[state.error] ?? labels.errors.invalid}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {labels.submit}
      </Button>
    </form>
  );
}
