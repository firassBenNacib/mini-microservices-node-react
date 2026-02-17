const express = require('express');
const { authenticateJwt } = require('../middleware/authenticate-jwt');
const controller = require('../controllers/api-controller');

function createApiRouter() {
  const router = express.Router();

  router.get('/health', controller.health);
  router.get('/message', authenticateJwt, controller.message);
  router.post('/send-test-email', authenticateJwt, controller.sendTestEmail);
  router.post('/send-test-notification', authenticateJwt, controller.sendTestNotification);

  return router;
}

module.exports = { createApiRouter };
