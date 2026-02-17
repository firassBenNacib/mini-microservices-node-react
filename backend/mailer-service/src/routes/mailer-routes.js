const express = require('express');

function createMailerRouter({ controller }) {
  const router = express.Router();

  router.get('/health', controller.health);
  router.post('/send', controller.send);

  return router;
}

module.exports = { createMailerRouter };

