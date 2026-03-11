const { config } = require('./config');
const { createPool } = require('./services/db');
const { runMigrations } = require('./services/migration-service');
const { seedDefaultUser } = require('./services/user-service');
const { createAuthController } = require('./controllers/auth-controller');
const { createAuthRouter } = require('./routes/auth-routes');
const { createApp } = require('./app');
const { logger } = require('./observability');

async function start() {
  await runMigrations(config.db);
  const pool = await createPool(config.db);
  await seedDefaultUser(pool, config.demoUser);

  const controller = createAuthController({ config, pool });
  const authRouter = createAuthRouter({ controller });
  const app = createApp({ authRouter });

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'auth-service listening');
  });
}

async function main() {
  try {
    await start();
  } catch (err) {
    logger.error({ err }, 'Failed to start auth-service');
    process.exit(1);
  }
}

main();
