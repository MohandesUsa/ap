import { loadConfig } from './config/env.ts';
import { PgClient } from './db/PgClient.ts';
import { buildApp } from './app.ts';

async function main() {
  const config = loadConfig();
  const db = new PgClient(config.databaseUrl);

  const server = await buildApp(db, config);

  server.listen(config.port, () => {
    console.log(`TruckAccounting backend listening on port ${config.port}`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    server.close();
    await db.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
