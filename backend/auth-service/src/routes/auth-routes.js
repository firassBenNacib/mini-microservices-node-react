const express = require('express');
const rateLimit = require('express-rate-limit');

function createAuthRouter({ controller }) {
  const router = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.get('/health', controller.health);
  router.get('/session', controller.session);
  router.post('/login', loginLimiter, controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);

  return router;
}

module.exports = { createAuthRouter };
