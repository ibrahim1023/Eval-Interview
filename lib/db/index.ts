import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Disable prefetch as it is not supported for serverless functions.
// Supabase session mode caps at 15 clients; dev hot-reloads create fresh
// module instances, so keep the pool tiny and reclaim idle connections fast.
const client = postgres(connectionString, { prepare: false, max: 3, idle_timeout: 20 });

export const db = drizzle(client, { schema });
