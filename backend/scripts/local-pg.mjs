import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';

const dataDir = path.resolve('/tmp/silut-pg-data');

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'lucytejada',
    password: 'lucytejada_dev_password',
    port: 5432,
    persistent: true,
  });

  try {
    await pg.initialise();
  } catch (err) {
    // Ya inicializado previamente
  }

  await pg.start();
  console.log('[SILUT Local PG] PostgreSQL real iniciado en localhost:5432');

  try {
    await pg.createDatabase('silut_lucytejada');
    console.log('[SILUT Local PG] Base de datos "silut_lucytejada" creada.');
  } catch {
    console.log('[SILUT Local PG] Base de datos "silut_lucytejada" ya existente.');
  }

  console.log('[SILUT Local PG] Listo: postgres://lucytejada:lucytejada_dev_password@localhost:5432/silut_lucytejada');

  const shutdown = async () => {
    console.log('[SILUT Local PG] Deteniendo PostgreSQL...');
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[SILUT Local PG] Error:', err);
  process.exit(1);
});
