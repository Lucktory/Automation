import { z } from "zod";

/**
 * THE ONLY FILE IN THE CODEBASE THAT MAY READ `process.env`.
 * Enforced by lint. Everything else imports `env` from here and gets a typed,
 * validated object — so a missing variable fails at boot with a clear message
 * instead of surfacing as `undefined` in a customs calculation at runtime.
 */

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url().optional(),

  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_URL: z.string().url().optional(),

  /** Daily TRM (Tasa Representativa del Mercado) feed. */
  TRM_API_URL: z.string().url().optional(),
  TRM_API_TOKEN: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  /**
   * Sólo para sembrar un despliegue de DEMOSTRACIÓN con credenciales que
   * funcionen. Ver `prisma/seed.ts` y docs/DEPLOY.md.
   */
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

/**
 * Un valor en blanco significa AUSENTE, no inválido.
 *
 * `z.string().url().optional()` sólo acepta `undefined`: una cadena vacía se
 * cuela hasta `.url()` y revienta. Y las cadenas vacías son la norma, no la
 * excepción — los paneles de despliegue guardan «» cuando dejas una variable
 * sin rellenar, y copiar `.env.example` tal cual mete media docena de ellas.
 * El resultado era un build muerto con «TRM_API_URL: Invalid url» para una
 * variable que es opcional y que nadie quería configurar.
 *
 * También se quitan las comillas que envuelven el valor. En un archivo `.env`
 * las comillas son sintaxis y el intérprete las retira; al pegar la misma línea
 * en el panel de un proveedor se guardan como parte del valor, y
 * `"postgresql://…"` con comillas no es una URL válida. Un valor rodeado por
 * comillas iguales nunca es intencionado.
 */
function normalize(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};

  for (const key of Object.keys(schema.shape)) {
    const raw = source[key];
    if (typeof raw !== "string") continue;

    let value = raw.trim();
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === '"' || first === "'") && first === last) {
        value = value.slice(1, -1).trim();
      }
    }

    if (value.length > 0) out[key] = value;
  }

  return out;
}

const parsed = schema.safeParse(normalize(process.env));

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid environment configuration:\n${issues}\n\n` +
      "Una variable en blanco se trata como ausente, así que este error significa " +
      "que el valor está puesto y mal formado. Revisa docs/DEPLOY.md §2.",
  );
}

export const env = parsed.data;
export type Env = typeof env;
