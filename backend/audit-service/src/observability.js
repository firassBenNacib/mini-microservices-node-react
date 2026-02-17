const pino = require('pino');
const pinoHttp = require('pino-http');
const client = require('prom-client');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
});

register.registerMetric(httpRequestDurationMs);

const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/metrics' || req.url === '/health',
  },
});

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') {
    return next();
  }

  const end = httpRequestDurationMs.startTimer();
  res.on('finish', () => {
    const route = req.route && req.route.path ? `${req.baseUrl || ''}${req.route.path}` : req.path;
    end({ method: req.method, route, status_code: String(res.statusCode) });
  });

  return next();
}

async function metricsEndpoint(req, res) {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = {
  logger,
  httpLogger,
  metricsMiddleware,
  metricsEndpoint,
};
