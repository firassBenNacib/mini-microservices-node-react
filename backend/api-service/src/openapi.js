const swaggerJsdoc = require('swagger-jsdoc');

function buildOpenApiSpec() {
  return swaggerJsdoc({
    failOnErrors: true,
    definition: {
      openapi: '3.1.0',
      info: {
        title: 'API Service',
        version: '1.0.0',
      },
      paths: {
        '/api/health': {
          get: {
            summary: 'API service health check',
            responses: { 200: { description: 'Healthy' } },
          },
        },
        '/api/message': {
          get: {
            summary: 'Load the dashboard status message',
            responses: {
              200: { description: 'Message returned' },
              401: { description: 'Authentication required' },
            },
          },
        },
        '/api/send-test-email': {
          post: {
            summary: 'Send a test email through the mailer service',
            responses: {
              200: { description: 'Email accepted' },
              401: { description: 'Authentication required' },
              403: { description: 'CSRF token mismatch' },
            },
          },
        },
        '/api/send-test-notification': {
          post: {
            summary: 'Send a test notification through the notification service',
            responses: {
              200: { description: 'Notification accepted' },
              401: { description: 'Authentication required' },
              403: { description: 'CSRF token mismatch' },
            },
          },
        },
      },
    },
    apis: [],
  });
}

module.exports = { buildOpenApiSpec };
