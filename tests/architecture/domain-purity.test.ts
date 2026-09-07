import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * La Regla de Dependencia, comprobada en tiempo de prueba además de en lint.
 *
 * El motor de liquidación tiene que correr IDÉNTICO en el servidor (cotización
 * oficial) y en el navegador (simulador en vivo), y su suite tiene que correr
 * sin base de datos. Eso solo se sostiene si la capa de dominio no conoce Next,
 * React ni Prisma. Es una propiedad que se pierde en silencio con un solo
 * import descuidado, así que se comprueba.
 */

const FORBIDDEN = [
  "next",
  "next/",
  "react",
  "react-dom",
  "@prisma/client",
  "next-intl",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".ts") ? [full] : [];
  });
}

const IMPORT_RE = /^\s*(?:import|export)[\s\S]*?from\s+["']([^"']+)["']/gm;

function importsOf(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(IMPORT_RE)].map((m) => m[1] as string);
}

describe("pureza de la capa de dominio", () => {
  const domainDirs = [
    "src/core",
    "src/modules/pricing/domain",
    "src/modules/parameters/domain",
  ];

  it("no importa Next, React ni Prisma en ninguna parte", () => {
    const violations: string[] = [];

    for (const dir of domainDirs) {
      for (const file of walk(dir)) {
        for (const specifier of importsOf(file)) {
          if (FORBIDDEN.some((f) => specifier === f || specifier.startsWith(`${f}/`))) {
            violations.push(`${file} importa ${specifier}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("no alcanza la capa de infraestructura de otro módulo", () => {
    const violations: string[] = [];

    for (const dir of domainDirs) {
      for (const file of walk(dir)) {
        for (const specifier of importsOf(file)) {
          if (specifier.includes("/infra/")) {
            violations.push(`${file} importa ${specifier}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("ninguna etapa de costo contiene una tarifa codificada", () => {
    // Las tasas entran por la TariffRule resuelta. Un decimal suelto en un
    // archivo de etapa es una tarifa escondida en el código.
    const violations: string[] = [];
    const RATE_LITERAL = /(?<![\w.])0\.\d+(?![\w])/g;

    for (const file of walk("src/modules/pricing/domain/stages")) {
      const source = readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => !l.trimStart().startsWith("//") && !l.trimStart().startsWith("*"))
        .join("\n");
      const found = source.match(RATE_LITERAL);
      if (found) violations.push(`${file}: ${found.join(", ")}`);
    }

    expect(violations).toEqual([]);
  });
});
