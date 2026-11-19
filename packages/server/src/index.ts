import { buildApp } from './app.js';
import { loadConfig, validateConfig } from './config.js';
import { assertDatabaseReady, createPool, migrate } from './db.js';
import { createMemoryRepository } from './repo.memory.js';
import { createPgRepository } from './repo.pg.js';
import type { Repository } from './repo.js';

async function main(): Promise<void> {
  const config = loadConfig();
  validateConfig(config);
  let repo: Repository;
  let pool: ReturnType<typeof createPool> | null = null;
  let healthCheck: (() => Promise<boolean>) | undefined;
  if (config.repo === 'pg') {
    pool = createPool(config.databaseUrl!);
    await assertDatabaseReady(pool);
    await migrate(pool);
    repo = createPgRepository(pool);
    healthCheck = async () => {
      try { await assertDatabaseReady(pool!); return true; } catch { return false; }
    };
  } else {
    repo = createMemoryRepository();
    console.warn('[server] REPO=memory; all data is lost on restart');
  }
  const { app, hub } = await buildApp(repo, config, { healthCheck });
  await app.listen({ host: '0.0.0.0', port: config.port });
  console.log(`[server] ZERO DAY listening on http://0.0.0.0:${config.port}`);
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    hub.closeAll();
    await app.close();
    if (pool) await pool.end();
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error) => {
  console.error('[server] FATAL', error);
  process.exit(1);
});
