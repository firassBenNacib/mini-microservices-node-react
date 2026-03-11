const express = require('express');
const rateLimit = require('express-rate-limit');

function createAuthRouter({ controller }) {
  const router = express.Router();

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.get('/health', controller.health);
  router.get('/session', authLimiter, controller.session);
  router.post('/login', authLimiter, controller.login);
  router.post('/refresh', authLimiter, controller.refresh);
  router.post('/logout', authLimiter, controller.logout);

  return router;
}

module.exports = { createAuthRouter };
