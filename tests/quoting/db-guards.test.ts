import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Los disparadores de inmutabilidad tienen que SEGUIR estando.
 *
 * Se prueba su existencia porque `prisma db push` —que está en package.json y
 * es lo que uno teclea cuando tiene prisa— reconstruye el esquema desde
 * `schema.prisma`, y `schema.prisma` no puede declarar un disparador. Un día
 * alguien lo ejecuta, la tabla queda igual, todo compila, todos los tests
 * pasan… y las cotizaciones enviadas vuelven a ser editables sin que nadie se
 * entere. Esta prueba es el único sitio donde ese silencio hace ruido.
 *
 * Si no hay base de datos configurada la prueba se salta: no todo el que corre
 * los tests tiene credenciales. En CI, donde sí las hay, es obligatoria.
 */

const REQUIRED_TRIGGERS = [
  { table: "quotes", trigger: "quotes_immutable_after_sent" },
  { table: "quote_line_items", trigger: "quote_line_items_immutable" },
  { table: "quote_vehicles", trigger: "quote_vehicles_immutable" },
];

function databaseUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const match = readFileSync(".env.local", "utf8").match(/^DATABASE_URL="(.+)"\s*$/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

const url = databaseUrl();
const describeDb = url ? describe : describe.skip;

describeDb("database guards", () => {
  async function query<T>(sql: string): Promise<T[]> {
    const { neonConfig, Pool } = await import("@neondatabase/serverless");
    const ws = (await import("ws")).default;
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: url! });
    try {
      const result = await pool.query(sql);
      return result.rows as T[];
    } finally {
      await pool.end();
    }
  }

  it("still has every immutability trigger", async () => {
    const rows = await query<{ tgname: string; relname: string }>(
      `SELECT t.tgname, c.relname
         FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
        WHERE NOT t.tgisinternal`,
    );

    const present = new Set(rows.map((row) => `${row.relname}.${row.tgname}`));

    for (const required of REQUIRED_TRIGGERS) {
      expect(
        present.has(`${required.table}.${required.trigger}`),
        `Falta el disparador ${required.trigger} en ${required.table}. ` +
          `Vuelve a aplicar prisma/migrations/20260906_quote_snapshot/migration.sql — ` +
          `probablemente un 'prisma db push' lo borró.`,
      ).toBe(true);
    }
  }, 30_000);

  it("still refuses a quote without a snapshot", async () => {
    const rows = await query<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'snapshot'`,
    );
    expect(rows[0]?.is_nullable).toBe("NO");
  }, 30_000);

  it("still has no zero defaults on the money columns", async () => {
    const rows = await query<{ column_name: string; column_default: string | null }>(
      `SELECT column_name, column_default FROM information_schema.columns
        WHERE table_name = 'quotes'
          AND column_name IN ('subtotalUsd','taxesCop','landedCostCop','totalCop')`,
    );
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.column_default, `${row.column_name} recuperó un DEFAULT`).toBeNull();
    }
  }, 30_000);

  it("still enforces one sequence number per year", async () => {
    const rows = await query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes
        WHERE tablename = 'quotes' AND indexname = 'quotes_issueYear_sequence_key'`,
    );
    expect(rows).toHaveLength(1);
  }, 30_000);
});
