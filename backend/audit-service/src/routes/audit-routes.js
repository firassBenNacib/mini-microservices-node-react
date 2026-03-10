const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateJwt } = require('../middleware/authenticate-jwt');

function createAuditRouter({ controller }) {
  const router = express.Router();
  const recentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.get('/health', controller.health);
  router.post('/events', controller.createEvent);
  router.get('/recent', recentLimiter, authenticateJwt, controller.recent);

  return router;
}

module.exports = { createAuditRouter };
