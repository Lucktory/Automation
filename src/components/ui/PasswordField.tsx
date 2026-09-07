"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useId, useState } from "react";
import clsx from "clsx";
import { passwordStrength } from "@/modules/identity";

/**
 * Campo de contraseña con icono, alternador de visibilidad y medidor opcional.
 *
 * Se comparte entre login, registro y restablecimiento. Tres copias del mismo
 * campo derivan en tres comportamientos distintos en cuanto alguien toca una.
 */

const STRENGTH_SEGMENTS = 4;
export function PasswordField({
  name,
  label,
  showLabel,
  autoComplete = "current-password",
  invalid = false,
  strengthLabels,
  describedBy,
}: {
  name: string;
  label: string;
  showLabel: string;
  autoComplete?: string;
  invalid?: boolean;
  /** Si se pasan, se muestra el medidor de fuerza. */
  strengthLabels?: { weak: string; fair: string; strong: string };
  describedBy?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState("");
  const meterId = useId();

  const score = passwordStrength(value);
  const tone = score <= 1 ? "danger" : score <= 2 ? "warning" : "success";
  const message = strengthLabels
    ? score <= 1
      ? strengthLabels.weak
      : score <= 2
        ? strengthLabels.fair
        : strengthLabels.strong
    : null;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="relative block">
          <Lock
            size={15}
            aria-hidden
            className="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
          />
          <input
            name={name}
            type={revealed ? "text" : "password"}
            required
            autoComplete={autoComplete}
            aria-invalid={invalid}
            aria-describedby={
              [describedBy, strengthLabels && value ? meterId : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            onChange={(event) => setValue(event.target.value)}
            className={clsx(
              "w-full rounded-control border bg-bg py-2 pr-10 pl-9 text-sm text-text-primary",
              invalid ? "border-danger" : "border-border",
            )}
          />
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={showLabel}
            aria-pressed={revealed}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </span>
      </label>

      {strengthLabels && value.length > 0 && (
        <div id={meterId}>
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: STRENGTH_SEGMENTS }, (_, index) => (
              <span
                key={index}
                className={clsx(
                  "h-1 flex-1 rounded-full transition-colors",
                  index < score
                    ? tone === "danger"
                      ? "bg-danger"
                      : tone === "warning"
                        ? "bg-warning"
                        : "bg-success"
                    : "bg-border",
                )}
              />
            ))}
          </div>
          <p
            className={clsx(
              "mt-1.5 text-[0.8125rem]",
              tone === "danger"
                ? "text-danger"
                : tone === "warning"
                  ? "text-warning"
                  : "text-success",
            )}
          >
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
