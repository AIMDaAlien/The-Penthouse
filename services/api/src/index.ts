import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/pool.js';

const app = await buildApp();

await app.listen({ host: env.HOST, port: env.PORT });

function gracefulShutdown(signal: string) {
  return async () => {
    app.log.info(`Received ${signal}, starting graceful shutdown...`);
    try {
      await app.close();
      await closeDb();
      app.log.info('Graceful shutdown complete.');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Graceful shutdown failed');
      process.exit(1);
    }
  };
}

process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('SIGINT', gracefulShutdown('SIGINT'));
