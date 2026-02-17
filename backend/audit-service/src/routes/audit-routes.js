const express = require('express');
const { authenticateJwt } = require('../middleware/authenticate-jwt');

function createAuditRouter({ controller }) {
  const router = express.Router();

  router.get('/health', controller.health);
  router.post('/events', controller.createEvent);
  router.get('/recent', authenticateJwt, controller.recent);

  return router;
}

module.exports = { createAuditRouter };
