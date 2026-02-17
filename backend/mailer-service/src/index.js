const { config } = require('./config');
const { createMailerService } = require('./services/mailer-service');
const { createMailerController } = require('./controllers/mailer-controller');
const { createMailerRouter } = require('./routes/mailer-routes');
const { createApp } = require('./app');
const { logger } = require('./observability');

const mailerService = createMailerService({ smtp: config.smtp });
const controller = createMailerController({ mailerService });
const mailerRouter = createMailerRouter({ controller });
const app = createApp({ mailerRouter });

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'mailer-service listening');
});
