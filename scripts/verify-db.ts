/**
 * Verify Supabase Postgres connectivity and apply schema.
 *
 * Run with: npx tsx --env-file=.env scripts/verify-db.ts
 */

export {};

import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const url = databaseUrl;

async function main() {
  const sql = postgres(url, { prepare: false });
  const r = await sql`select version()`;
  console.log("DB connected:", String(r[0].version).slice(0, 80));
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
