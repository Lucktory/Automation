#!/usr/bin/env node
/**
 * i18n key parity check.
 *
 * A key present in one locale and missing in the other fails the build. This is
 * the single check that keeps the second locale from quietly rotting as the
 * product grows — without it, English drifts behind Spanish within a month and
 * the language toggle starts showing blanks.
 *
 * Also validates that ICU interpolation variables match across locales, so
 * `{count}` in Spanish cannot become `{total}` in English.
 */

import { readdir, readFile } from "node:fs/promises";
import { parse as parseIcu, TYPE } from "@formatjs/icu-messageformat-parser";
import { join } from "node:path";

const MESSAGES_DIR = join(process.cwd(), "src", "messages");
const REFERENCE_LOCALE = "es";

function flatten(object, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

/**
 * Los argumentos que una traducción espera recibir.
 *
 * Se parsea el ICU de verdad en vez de barrer llaves con una expresión regular.
 * El barrido confundía el texto de una rama de plural con un nombre de
 * argumento —en «{n, plural, other {y # más}}» leía «y» como variable—, así que
 * dos traducciones perfectamente compatibles se denunciaban como distintas y la
 * salida fácil era reescribir la frase para contentar al comprobador en vez de
 * arreglarlo.
 *
 * Un mensaje con ICU inválido devuelve un centinela: eso es un fallo real —
 * revienta en tiempo de render— y tiene que salir como diferencia.
 */
function variablesIn(message) {
  if (typeof message !== "string") return [];

  const found = new Set();
  const walk = (nodes) => {
    for (const node of nodes) {
      // Todo nodo con `value` que no sea texto literal nombra un argumento:
      // argument, number, date, time, select, plural...
      if (node.type !== TYPE.literal && typeof node.value === "string") found.add(node.value);
      if (node.options) for (const option of Object.values(node.options)) walk(option.value);
      if (node.children) walk(node.children);
    }
  };

  try {
    walk(parseIcu(message));
  } catch {
    return ["<ICU invalido>"];
  }
  return [...found].sort();
}

/**
 * next-intl reserves "." as its nesting separator, so a key literally named
 * "TAX.ARANCEL" is ambiguous and throws INVALID_KEY at render time. Nest the
 * object instead — `t("stages.TAX.ARANCEL")` then resolves through the path.
 * Catching it here turns a runtime crash into a build failure.
 */
function invalidKeysIn(object, prefix = "") {
  const found = [];
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (key.includes(".")) found.push(path);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      found.push(...invalidKeysIn(value, path));
    }
  }
  return found;
}

const shapeProblems = [];

async function loadLocale(locale) {
  const dir = join(MESSAGES_DIR, locale);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const merged = {};
  for (const file of files) {
    const namespace = file.replace(/\.json$/, "");
    const raw = await readFile(join(dir, file), "utf8");
    merged[namespace] = JSON.parse(raw);
  }
  for (const path of invalidKeysIn(merged)) {
    shapeProblems.push(
      `INVALID  [${locale}] ${path} — key contains "."; nest the object instead (next-intl uses "." for nesting)`,
    );
  }
  return flatten(merged);
}

const locales = (await readdir(MESSAGES_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

if (!locales.includes(REFERENCE_LOCALE)) {
  console.error(`Reference locale "${REFERENCE_LOCALE}" not found in ${MESSAGES_DIR}`);
  process.exit(1);
}

const reference = await loadLocale(REFERENCE_LOCALE);
const referenceKeys = new Set(Object.keys(reference));
const problems = shapeProblems;

for (const locale of locales) {
  if (locale === REFERENCE_LOCALE) continue;

  const target = await loadLocale(locale);
  const targetKeys = new Set(Object.keys(target));

  for (const key of referenceKeys) {
    if (!targetKeys.has(key)) {
      problems.push(`MISSING  [${locale}] ${key}`);
      continue;
    }
    const expected = variablesIn(reference[key]).join(",");
    const actual = variablesIn(target[key]).join(",");
    if (expected !== actual) {
      problems.push(
        `VARS     [${locale}] ${key} — ${REFERENCE_LOCALE}: {${expected}} vs ${locale}: {${actual}}`,
      );
    }
  }

  for (const key of targetKeys) {
    if (!referenceKeys.has(key)) {
      problems.push(`ORPHAN   [${locale}] ${key} — not present in ${REFERENCE_LOCALE}`);
    }
  }
}

/**
 * Todo catálogo tiene que estar REGISTRADO, no solo existir.
 *
 * Esta comprobación nació de un fallo real: `auth.json` estaba completo en los
 * dos idiomas y con paridad perfecta, pero nadie lo había añadido a
 * `src/messages/index.ts`. La verificación pasaba en verde mientras las
 * pantallas de acceso y de registro imprimían ⟨auth.login.email⟩ en producción.
 *
 * Un archivo de traducciones que nadie carga es peor que uno que falta: da la
 * impresión de estar hecho.
 */
{
  const index = await readFile("src/messages/index.ts", "utf8");
  for (const locale of locales) {
    for (const file of await readdir(`src/messages/${locale}`)) {
      if (!file.endsWith(".json")) continue;
      const namespace = file.replace(/\.json$/, "");
      const imported = index.includes(`./${locale}/${file}`);
      const registered = new RegExp(`\\b${namespace}\\s*:`).test(index);
      if (!imported || !registered) {
        problems.push(
          `UNWIRED  [${locale}] ${file} — existe pero no está registrado en src/messages/index.ts, así que sus claves nunca se cargan`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`\ni18n parity check failed with ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("");
  process.exit(1);
}

console.log(
  `i18n parity OK — ${referenceKeys.size} keys consistent across ${locales.join(", ")}`,
);
