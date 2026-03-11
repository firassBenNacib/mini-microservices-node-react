const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { config } = require('./config');
const { handleUnexpectedError } = require('./http/problem-response');
const { httpLogger, metricsEndpoint, metricsMiddleware } = require('./observability');
const { buildOpenApiSpec } = require('./openapi');

function createApp({ auditRouter }) {
  const app = express();
  app.set('trust proxy', 1);

  app.use(httpLogger);
  app.use(metricsMiddleware);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/metrics', metricsEndpoint);
  app.get('/openapi.json', (req, res) => {
    res.json(buildOpenApiSpec());
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(apiLimiter);

  app.use('/audit', auditRouter);

  app.use((err, req, res, next) => {
    return handleUnexpectedError(req, res, err);
  });

  return app;
}

module.exports = { createApp };
