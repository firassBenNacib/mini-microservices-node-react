const swaggerJsdoc = require('swagger-jsdoc');

function buildOpenApiSpec() {
  return swaggerJsdoc({
    failOnErrors: true,
    definition: {
      openapi: '3.1.0',
      info: {
        title: 'Audit Service',
        version: '1.0.0',
      },
      paths: {
        '/audit/health': {
          get: {
            summary: 'Audit service health check',
            responses: { 200: { description: 'Healthy' } },
          },
        },
        '/audit/events': {
          post: {
            summary: 'Create an audit event',
            responses: {
              200: { description: 'Audit event persisted' },
              401: { description: 'Invalid audit service API key' },
            },
          },
        },
        '/audit/recent': {
          get: {
            summary: 'List recent audit events',
            responses: {
              200: { description: 'Audit events returned' },
              401: { description: 'Authentication required' },
            },
          },
        },
      },
    },
    apis: [],
  });
}

module.exports = { buildOpenApiSpec };
