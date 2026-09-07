"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { completeResetAction, type ResetState } from "../actions";

const INITIAL: ResetState = { status: "idle", error: null };

export function ResetForm({
  token,
  signInHref,
  labels,
}: {
  token: string;
  signInHref: string;
  labels: {
    newPassword: string;
    confirm: string;
    showPassword: string;
    strength: { weak: string; fair: string; strong: string };
    save: string;
    doneTitle: string;
    doneBody: string;
    signIn: string;
    errors: Record<string, string>;
  };
}) {
  const [state, formAction, pending] = useActionState(completeResetAction, INITIAL);

  if (state.status === "done") {
    return (
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-full bg-success/12 text-success"
        >
          <CheckCircle2 size={22} />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-text-primary">
            {labels.doneTitle}
          </p>
          <p className="mt-2 text-sm text-text-secondary">{labels.doneBody}</p>
        </div>
        <Link href={signInHref} className="text-[0.8125rem] text-primary hover:underline">
          {labels.signIn}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      <PasswordField
        name="password"
        label={labels.newPassword}
        showLabel={labels.showPassword}
        autoComplete="new-password"
        invalid={state.error === "weakPassword"}
        strengthLabels={labels.strength}
      />

      <PasswordField
        name="confirm"
        label={labels.confirm}
        showLabel={labels.showPassword}
        autoComplete="new-password"
        invalid={state.error === "mismatch"}
      />

      {state.error && (
        <p role="alert" className="text-[0.8125rem] text-danger">
          {labels.errors[state.error] ?? labels.errors.invalidToken}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {labels.save}
      </Button>
    </form>
  );
}
