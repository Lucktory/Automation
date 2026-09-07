import { readFileSync } from "node:fs";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

/**
 * Aplica un archivo .sql contra la base de datos, dentro de una transacción.
 *
 * Existe porque el motor de esquema nativo de Prisma
 * (schema-engine-windows.exe) aborta con STATUS_ILLEGAL_INSTRUCTION en esta
 * máquina, y `prisma db execute` devuelve código 0 sin aplicar nada — un fallo
 * silencioso especialmente traicionero: parece que migró y la base queda vacía.
 *
 * El driver serverless de Neon es JavaScript puro y sí funciona, así que las
 * migraciones se aplican por aquí. Todo o nada: una migración a medias sobre un
 * esquema de 56 tablas es peor que ninguna.
 *
 *   node scripts/db-apply-sql.mjs prisma/migrations/0_init/migration.sql
 */

neonConfig.webSocketConstructor = ws;

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/db-apply-sql.mjs <archivo.sql>");
  process.exit(1);
}

const match = readFileSync(".env.local", "utf8").match(/^DATABASE_URL="(.+)"\s*$/m);
if (!match) throw new Error("No se encontró DATABASE_URL en .env.local");

const sql = readFileSync(file, "utf8");
const pool = new Pool({ connectionString: match[1] });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log(`Aplicado: ${file}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error(`FALLÓ, sin cambios: ${error.message}`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
