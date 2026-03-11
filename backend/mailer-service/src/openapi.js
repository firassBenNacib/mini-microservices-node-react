const swaggerJsdoc = require('swagger-jsdoc');

function buildOpenApiSpec() {
  return swaggerJsdoc({
    failOnErrors: true,
    definition: {
      openapi: '3.1.0',
      info: {
        title: 'Mailer Service',
        version: '1.0.0',
      },
      paths: {
        '/health': {
          get: {
            summary: 'Mailer service health check',
            responses: { 200: { description: 'Healthy' } },
          },
        },
        '/send': {
          post: {
            summary: 'Send an email through SMTP',
            responses: {
              200: { description: 'Email accepted' },
              401: { description: 'Invalid mailer API key' },
            },
          },
        },
      },
    },
    apis: [],
  });
}

module.exports = { buildOpenApiSpec };
