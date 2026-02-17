const { config } = require('./config');
const { createApp } = require('./app');
const { logger } = require('./observability');

const app = createApp();

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'api-service listening');
});
