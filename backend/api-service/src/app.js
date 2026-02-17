const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { config } = require('./config');
const { createApiRouter } = require('./routes/api-routes');
const { httpLogger, metricsEndpoint, metricsMiddleware } = require('./observability');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(httpLogger);
  app.use(metricsMiddleware);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/metrics', metricsEndpoint);

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(apiLimiter);

  app.use('/api', createApiRouter());

  app.use((err, req, res, next) => {
    const message = err && err.message ? err.message : 'internal error';
    if (req.log) {
      req.log.error({ err }, 'request error');
    }
    res.status(500).json({ error: message });
  });

  return app;
}

module.exports = { createApp };
