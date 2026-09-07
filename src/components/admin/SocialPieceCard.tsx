"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { SocialPiece, type SocialPieceProps } from "./SocialPiece";

/**
 * Una pieza en la rejilla: la creatividad, sus metadatos y sus acciones.
 *
 * Es cliente por dos motivos concretos y ninguno más: la barra de acciones
 * aparece al pasar el cursor, y "Copiar enlace" necesita el portapapeles. La
 * composición de la pieza sigue siendo servidor.
 *
 * La barra flotante también aparece con el foco del teclado (`focus-within`).
 * Una acción que sólo existe bajo el ratón no existe para quien navega con
 * tabulador, y por eso el menú de tres puntos repite las mismas opciones: es la
 * ruta accesible a lo mismo, no un menú distinto.
 */

export interface SocialPieceCardProps {
  piece: SocialPieceProps;
  vehicle: string;
  /** «Ficha cuadrada · 1080 × 1080 · 5 de septiembre de 2026» */
  meta: string;
  isPublished: boolean;
  href: string;
  labels: {
    download: string;
    copyLink: string;
    publish: string;
    unpublish: string;
    regenerate: string;
    delete: string;
    menu: string;
    copied: string;
  };
}

export function SocialPieceCard({
  piece,
  vehicle,
  meta,
  isPublished,
  href,
  labels,
}: SocialPieceCardProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer, y fallar en silencio
      // es preferible a un diálogo de error por una acción secundaria.
    }
  };

  const publishLabel = isPublished ? labels.unpublish : labels.publish;

  return (
    <li className="group/piece flex flex-col">
      <div className="relative overflow-hidden rounded-card border border-border focus-within:ring-2 focus-within:ring-primary/40">
        <SocialPiece {...piece} />

        {/* Barra de acciones: aparece sobre la pieza, no debajo, para no
            desplazar la rejilla al pasar el cursor. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1 bg-black/70 px-2 py-2 opacity-0 backdrop-blur-sm transition-all duration-150 group-hover/piece:pointer-events-auto group-hover/piece:translate-y-0 group-hover/piece:opacity-100 group-focus-within/piece:pointer-events-auto group-focus-within/piece:translate-y-0 group-focus-within/piece:opacity-100">
          <a
            href={href}
            download
            className="rounded-control px-2.5 py-1 text-xs font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white"
          >
            {labels.download}
          </a>
          <button
            type="button"
            onClick={copy}
            className="rounded-control px-2.5 py-1 text-xs font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white"
          >
            {copied ? labels.copied : labels.copyLink}
          </button>
          <button
            type="button"
            className="rounded-control px-2.5 py-1 text-xs font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white"
          >
            {publishLabel}
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2 pt-2.5">
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] font-medium text-text-primary">{vehicle}</p>
          <p className="mt-0.5 truncate text-xs text-text-muted">{meta}</p>
        </div>

        <Menu
          label={labels.menu}
          align="end"
          trigger={({ open }) => (
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-control transition-colors ${
                open ? "bg-surface-elevated text-text-primary" : "text-text-muted hover:bg-surface-elevated hover:text-text-primary"
              }`}
            >
              <MoreVertical size={15} aria-hidden />
            </span>
          )}
        >
          {(close) => (
            <>
              <a
                href={href}
                download
                role="menuitem"
                onClick={close}
                className="block w-full px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                {labels.download}
              </a>
              <MenuItem
                onSelect={() => {
                  void copy();
                  close();
                }}
              >
                {labels.copyLink}
              </MenuItem>
              <MenuItem onSelect={close}>{publishLabel}</MenuItem>
              <MenuItem onSelect={close}>{labels.regenerate}</MenuItem>
              <MenuItem onSelect={close} tone="danger">
                {labels.delete}
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </li>
  );
}
