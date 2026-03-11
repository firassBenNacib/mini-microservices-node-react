const { config } = require('./config');
const { createPool } = require('./services/db');
const { runMigrations } = require('./services/migration-service');
const { createAuditController } = require('./controllers/audit-controller');
const { createAuditRouter } = require('./routes/audit-routes');
const { createApp } = require('./app');
const { logger } = require('./observability');

async function start() {
  await runMigrations(config.db);
  const pool = await createPool(config.db);

  const controller = createAuditController({ pool });
  const auditRouter = createAuditRouter({ controller });
  const app = createApp({ auditRouter });

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'audit-service listening');
  });
}

async function main() {
  try {
    await start();
  } catch (err) {
    logger.error({ err }, 'Failed to start audit-service');
    process.exit(1);
  }
}

main();
