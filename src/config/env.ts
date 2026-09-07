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
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
