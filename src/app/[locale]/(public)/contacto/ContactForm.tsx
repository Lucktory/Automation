"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { submitContact } from "./actions";

/**
 * Formulario de contacto.
 *
 * Es cliente solo por el acuse: el envío va a una acción de servidor. Lo que
 * importa para la demostración es que pulsar «Enviar» produzca una respuesta
 * VISIBLE — un formulario que no acusa recibo se lee como roto aunque haya
 * guardado la fila correctamente.
 */

const FIELDS = ["name", "email", "phone"] as const;

export function ContactForm({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    fields: Record<string, string>;
    submit: string;
    note: string;
    sending: string;
    sent: string;
    invalid: string;
    failed: string;
  };
}) {
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "sent" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const field =
    "w-full rounded-control border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

  if (state.kind === "sent") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-success/40 bg-surface p-6">
        <CheckCircle2 size={20} aria-hidden className="text-success" />
        <p className="text-sm text-text-primary">{labels.sent}</p>
        <Button size="sm" onClick={() => setState({ kind: "idle" })}>
          {labels.submit}
        </Button>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const result = await submitContact(formData);
          setState(
            result.ok
              ? { kind: "sent" }
              : {
                  kind: "error",
                  message: result.reason === "INVALID" ? labels.invalid : labels.failed,
                },
          );
        });
      }}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((key) => (
          <label key={key} className="flex flex-col gap-1.5 last:sm:col-span-2">
            <span className="text-xs text-text-secondary">{labels.fields[key]}</span>
            <input
              type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
              name={key}
              required={key !== "phone"}
              className={field}
              placeholder={labels.fields[key]}
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-text-secondary">{labels.fields.message}</span>
        <textarea
          name="message"
          rows={5}
          required
          className={`${field} resize-y`}
          placeholder={labels.fields.message}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? labels.sending : labels.submit}
        </Button>
        <span className="text-xs text-text-muted">{labels.note}</span>
      </div>

      {state.kind === "error" && (
        <p className="text-xs text-danger">{state.message}</p>
      )}
    </form>
  );
}
