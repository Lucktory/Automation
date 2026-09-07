"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

/**
 * Botón que abre un panel de acción.
 *
 * Existe porque una pantalla del back-office puede ofrecer «Agregar fuente» o
 * «Nueva entrada» mucho antes de que exista el alta completa detrás. La opción
 * mala es dejar el botón sin manejador: se ve idéntico a los que sí funcionan y
 * al pulsarlo no ocurre nada, que es como se lee una pantalla rota.
 *
 * Este componente da la respuesta que el usuario espera —se abre un panel con
 * el formulario real de la acción— y confirma al enviar. Lo que todavía no hace
 * es escribir en la base; cuando esa parte exista, se le pasa una acción de
 * servidor por `onSubmit` y el componente no cambia de forma.
 *
 * Usa `<dialog>` nativo: trae el foco atrapado, el cierre con Escape y el fondo
 * inerte sin que tengamos que reimplementarlos.
 */

export interface DialogField {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "checkboxes";
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
  /**
   * Opciones marcadas de salida en un grupo `checkboxes`.
   *
   * Un grupo donde hay que marcar todo a mano cada vez convierte la acción
   * frecuente en trabajo; las que se eligen casi siempre vienen puestas y se
   * quitan si sobran.
   */
  defaultChecked?: readonly string[];
}

export function ActionDialog({
  trigger,
  title,
  description,
  fields,
  submitLabel,
  cancelLabel,
  confirmation,
  closeLabel,
  variant = "primary",
  onSubmit,
}: {
  trigger: string;
  title: string;
  description?: string;
  fields: readonly DialogField[];
  submitLabel: string;
  cancelLabel: string;
  confirmation: string;
  closeLabel: string;
  variant?: "primary" | "ghost";
  onSubmit?: (data: FormData) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    // El acuse se queda un momento y luego el panel se cierra solo: obliga a
    // ver la confirmación sin dejar un diálogo abierto que hay que despachar.
    const timer = setTimeout(() => {
      ref.current?.close();
      setDone(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, [done]);

  const input =
    "w-full rounded-control border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => ref.current?.showModal()}>
        {trigger}
      </Button>

      <dialog
        ref={ref}
        onClose={() => setDone(false)}
        className="w-[min(30rem,92vw)] rounded-modal border border-border bg-surface p-0 text-text-primary backdrop:bg-black/60"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="font-display text-base font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={closeLabel}
            className="shrink-0 rounded-control p-1 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        {done ? (
          <p className="px-5 py-8 text-center text-sm text-success">{confirmation}</p>
        ) : (
          <form
            className="flex flex-col gap-3.5 px-5 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              if (onSubmit) void onSubmit(data);
              setDone(true);
            }}
          >
            {fields.map((field) =>
              /* Un grupo de casillas no es una etiqueta con un control dentro:
                 son varios controles con una leyenda común, y envolverlos en un
                 <label> haría que pulsar la leyenda marcase el primero. */
              field.type === "checkboxes" ? (
                <fieldset key={field.name} className="flex flex-col gap-1.5">
                  <legend className="mb-1 text-xs text-text-secondary">{field.label}</legend>
                  <div className="flex flex-col gap-2">
                    {(field.options ?? []).map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2.5 text-[0.8125rem] text-text-primary"
                      >
                        <input
                          type="checkbox"
                          name={field.name}
                          value={option.value}
                          defaultChecked={field.defaultChecked?.includes(option.value) ?? false}
                          className="size-3.5 accent-primary"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
              <label key={field.name} className="flex flex-col gap-1.5">
                <span className="text-xs text-text-secondary">{field.label}</span>

                {field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    rows={3}
                    defaultValue={field.defaultValue ?? ""}
                    placeholder={field.placeholder ?? ""}
                    className={`${input} resize-y`}
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.name}
                    defaultValue={field.defaultValue ?? ""}
                    className={input}
                  >
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type ?? "text"}
                    name={field.name}
                    defaultValue={field.defaultValue ?? ""}
                    placeholder={field.placeholder ?? ""}
                    className={input}
                  />
                )}
              </label>
              ),
            )}

            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" size="sm" onClick={() => ref.current?.close()}>
                {cancelLabel}
              </Button>
              <Button type="submit" variant="primary" size="sm">
                {submitLabel}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
