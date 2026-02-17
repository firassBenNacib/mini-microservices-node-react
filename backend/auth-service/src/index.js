const { config } = require('./config');
const { createPool, initSchema } = require('./services/db');
const { seedDefaultUser } = require('./services/user-service');
const { createAuthController } = require('./controllers/auth-controller');
const { createAuthRouter } = require('./routes/auth-routes');
const { createApp } = require('./app');
const { logger } = require('./observability');

async function start() {
  const pool = await createPool(config.db);
  await initSchema(pool);
  await seedDefaultUser(pool, config.demoUser);

  const controller = createAuthController({ config, pool });
  const authRouter = createAuthRouter({ controller });
  const app = createApp({ authRouter });

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'auth-service listening');
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start auth-service');
  process.exit(1);
});
