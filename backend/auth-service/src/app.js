const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config } = require('./config');
const { httpLogger, metricsEndpoint, metricsMiddleware } = require('./observability');

function createApp({ authRouter }) {
  const app = express();
  app.set('trust proxy', 1);

  app.use(httpLogger);
  app.use(metricsMiddleware);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/metrics', metricsEndpoint);
  app.use('/auth', authRouter);

  app.use((err, req, res, next) => {
    if (req.log) {
      req.log.error({ err }, 'request error');
    }
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}

module.exports = { createApp };
