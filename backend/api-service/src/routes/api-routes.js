const express = require('express');
const { authenticateJwt } = require('../middleware/authenticate-jwt');
const { requireCsrf } = require('../middleware/require-csrf');
const controller = require('../controllers/api-controller');

function createApiRouter() {
  const router = express.Router();

  router.get('/health', controller.health);
  router.get('/message', authenticateJwt, controller.message);
  router.post('/send-test-email', authenticateJwt, requireCsrf, controller.sendTestEmail);
  router.post('/send-test-notification', authenticateJwt, requireCsrf, controller.sendTestNotification);

  return router;
}

module.exports = { createApiRouter };
