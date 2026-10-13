import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

export const db = drizzle({
  client: pool,
  schema,
});

export async function connectDatabase(): Promise<void> {
  await db.execute(sql`SELECT 1`);
}

export async function disconnectDatabase(): Promise<void> {
  await pool.end();
}
