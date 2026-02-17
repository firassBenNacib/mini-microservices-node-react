const { config } = require('./config');
const { createPool, initSchema } = require('./services/db');
const { createAuditController } = require('./controllers/audit-controller');
const { createAuditRouter } = require('./routes/audit-routes');
const { createApp } = require('./app');
const { logger } = require('./observability');

async function start() {
  const pool = await createPool(config.db);
  await initSchema(pool);

  const controller = createAuditController({ pool });
  const auditRouter = createAuditRouter({ controller });
  const app = createApp({ auditRouter });

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'audit-service listening');
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start audit-service');
  process.exit(1);
});
