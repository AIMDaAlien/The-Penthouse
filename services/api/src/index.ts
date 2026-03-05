import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { pool } from './db/pool.js';
import { initRealtime } from './realtime/socket.js';

async function main() {
  await runMigrations();

  const app = await createApp();
  app.decorate('io', initRealtime(app));

  const shutdown = async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`API listening on ${env.PORT}`);
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
