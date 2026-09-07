"use client";

import { MoreVertical, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { Pill, StatusDot } from "@/components/admin/Pill";
import { Button } from "@/components/ui/Button";
import { Menu, MenuItem } from "@/components/ui/Menu";
import type { PillTone } from "@/config/role-display";
import {
  changeRoleAction,
  reactivateUsersAction,
  suspendUsersAction,
  type ActionResult,
} from "./actions";

/**
 * Vista de la fila, ya formateada en el servidor.
 *
 * Solo cadenas y booleanos: una función no cruza la frontera servidor/cliente,
 * y las fechas relativas dependen del locale, que se resuelve allí.
 */
export interface UserRowView {
  id: string;
  name: string;
  email: string;
  initials: string;
  roleLabel: string;
  roleTone: PillTone;
  statusLabel: string;
  statusTone: PillTone;
  lastAccessLabel: string;
  createdLabel: string;
  isSelf: boolean;
  isSuspended: boolean;
}

export interface RoleChoice {
  value: string;
  label: string;
}

interface Labels {
  empty: string;
  selectedOne: string;
  selectedMany: string;
  changeRole: string;
  suspend: string;
  reactivate: string;
  clear: string;
  rowActions: string;
  errors: Record<string, string>;
}

export function UsersTable({
  rows,
  roles,
  labels,
  columns,
  canWrite,
}: {
  rows: readonly UserRowView[];
  roles: readonly RoleChoice[];
  columns: Record<"user" | "role" | "status" | "lastAccess" | "created" | "actions", string>;
  labels: Labels;
  canWrite: boolean;
}) {
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // La propia cuenta nunca es seleccionable: las dos acciones masivas son
  // suspender y cambiar rol, y ambas te dejarían fuera del back-office.
  const selectable = rows.filter((r) => !r.isSelf);
  const allSelected = selectable.length > 0 && selected.length === selectable.length;

  const toggle = (id: string) =>
    setSelected((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const toggleAll = () => setSelected(allSelected ? [] : selectable.map((r) => r.id));

  /** Un solo camino para toda mutación: mismo manejo de error y de pendiente. */
  async function run(
    action: (data: FormData) => Promise<ActionResult>,
    ids: readonly string[],
    role?: string,
  ) {
    setPending(true);
    setError(null);

    const data = new FormData();
    for (const id of ids) data.append("ids", id);
    if (role !== undefined) data.append("role", role);

    const result = await action(data);
    setPending(false);

    if (result.ok) setSelected([]);
    else setError(labels.errors[result.errorCode] ?? labels.errors.INVALID ?? null);
  }

  if (rows.length === 0) {
    return <p className="px-5 py-12 text-center text-sm text-text-muted">{labels.empty}</p>;
  }

  const rowMenu = (row: UserRowView) => (
    <Menu
      label={`${labels.rowActions} — ${row.name}`}
      align="end"
      trigger={() => <MoreVertical size={16} aria-hidden />}
    >
      {(close) => (
        <>
          <p className="px-3 pt-2 pb-1 text-xs tracking-wide text-text-muted uppercase">
            {labels.changeRole}
          </p>
          {roles.map((role) => (
            <MenuItem
              key={role.value}
              onSelect={() => {
                close();
                void run(changeRoleAction, [row.id], role.value);
              }}
            >
              {role.label}
            </MenuItem>
          ))}
          <span className="my-1 block h-px bg-border" aria-hidden />
          <MenuItem
            tone={row.isSuspended ? "default" : "danger"}
            onSelect={() => {
              close();
              void run(
                row.isSuspended ? reactivateUsersAction : suspendUsersAction,
                [row.id],
              );
            }}
          >
            {row.isSuspended ? labels.reactivate : labels.suspend}
          </MenuItem>
        </>
      )}
    </Menu>
  );

  return (
    <>
      {/* Tabla desde sm. En 390px una cuadrícula de 7 columnas no es una tabla
          reducida, es una pantalla rota. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {canWrite && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label={labels.clear}
                    className="size-4 accent-[var(--primary)]"
                  />
                </th>
              )}
              {(["user", "role", "status", "lastAccess", "created"] as const).map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium tracking-wide text-text-muted uppercase"
                >
                  {columns[key]}
                </th>
              ))}
              <th scope="col" className="w-12 px-4 py-3">
                <span className="sr-only">{columns.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const checked = selected.includes(row.id);
              return (
                <tr
                  key={row.id}
                  className={clsx(
                    "border-b border-border transition-colors last:border-0",
                    checked ? "bg-surface-elevated" : "hover:bg-surface-elevated",
                  )}
                >
                  {canWrite && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={row.isSelf}
                        onChange={() => toggle(row.id)}
                        aria-label={row.name}
                        className="size-4 accent-[var(--primary)] disabled:opacity-30"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-elevated text-xs font-medium text-text-primary"
                      >
                        {row.initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-text-primary">{row.name}</span>
                        <span className="block truncate text-[0.8125rem] text-text-muted">
                          {row.email}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={row.roleTone}>{row.roleLabel}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot tone={row.statusTone}>{row.statusLabel}</StatusDot>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{row.lastAccessLabel}</td>
                  <td className="px-4 py-3 text-text-muted" data-numeric>
                    {row.createdLabel}
                  </td>
                  <td className="px-4 py-3">
                    {canWrite && !row.isSelf ? (
                      <span className="flex justify-end">{rowMenu(row)}</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tarjetas en móvil. */}
      <ul className="divide-y divide-border sm:hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-3 px-4 py-4">
            {canWrite && (
              <input
                type="checkbox"
                checked={selected.includes(row.id)}
                disabled={row.isSelf}
                onChange={() => toggle(row.id)}
                aria-label={row.name}
                className="mt-1 size-4 shrink-0 accent-[var(--primary)] disabled:opacity-30"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-text-primary">{row.name}</span>
              <span className="block truncate text-[0.8125rem] text-text-muted">
                {row.email}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={row.roleTone}>{row.roleLabel}</Pill>
                <StatusDot tone={row.statusTone}>{row.statusLabel}</StatusDot>
              </span>
              <span className="mt-1 block text-xs text-text-muted">
                {row.lastAccessLabel}
              </span>
            </span>
            {canWrite && !row.isSelf && <span className="shrink-0">{rowMenu(row)}</span>}
          </li>
        ))}
      </ul>

      {/* Barra de acciones masivas. */}
      {canWrite && selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex w-full max-w-2xl flex-wrap items-center gap-3 rounded-card border border-border bg-surface-elevated px-4 py-3 shadow-2xl">
            <span className="text-sm text-text-primary">
              {selected.length === 1
                ? labels.selectedOne
                : labels.selectedMany.replace("{count}", String(selected.length))}
            </span>

            {error && (
              <span role="alert" className="text-[0.8125rem] text-danger">
                {error}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Menu
                label={labels.changeRole}
                trigger={() => (
                  <span className="inline-flex items-center rounded-control border border-border-strong px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface">
                    {labels.changeRole}
                  </span>
                )}
              >
                {(close) =>
                  roles.map((role) => (
                    <MenuItem
                      key={role.value}
                      onSelect={() => {
                        close();
                        void run(changeRoleAction, selected, role.value);
                      }}
                    >
                      {role.label}
                    </MenuItem>
                  ))
                }
              </Menu>

              <Button
                size="sm"
                disabled={pending}
                onClick={() => void run(suspendUsersAction, selected)}
              >
                {labels.suspend}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setSelected([]);
                  setError(null);
                }}
                aria-label={labels.clear}
                className="rounded-control p-2 text-text-muted hover:text-text-primary"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
