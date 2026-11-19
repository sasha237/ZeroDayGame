import { readFile } from 'node:fs/promises';
import pg from 'pg';

export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl, max: 10 });
}

export async function migrate(pool: pg.Pool): Promise<void> {
  const sql = await readFile(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8');
  await pool.query(sql);
}

export async function assertDatabaseReady(pool: pg.Pool): Promise<void> {
  await pool.query('SELECT 1');
}
