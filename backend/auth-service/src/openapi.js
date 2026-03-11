const swaggerJsdoc = require('swagger-jsdoc');

function buildOpenApiSpec() {
  return swaggerJsdoc({
    failOnErrors: true,
    definition: {
      openapi: '3.1.0',
      info: {
        title: 'Node Auth Service API',
        version: '1.0.0',
      },
      paths: {
        '/auth/health': {
          get: {
            summary: 'Service health',
            responses: {
              200: {
                description: 'Health response',
              },
            },
          },
        },
        '/auth/session': {
          get: {
            summary: 'Current session state',
            responses: {
              200: {
                description: 'Session state',
              },
            },
          },
        },
        '/auth/login': {
          post: {
            summary: 'Authenticate and set session cookies',
            responses: {
              200: {
                description: 'Authenticated session',
              },
            },
          },
        },
        '/auth/refresh': {
          post: {
            summary: 'Rotate refresh token and renew the access token',
            responses: {
              200: {
                description: 'Authenticated session',
              },
            },
          },
        },
        '/auth/logout': {
          post: {
            summary: 'Clear active session cookies',
            responses: {
              200: {
                description: 'Logout status',
              },
            },
          },
        },
      },
    },
    apis: [],
  });
}

module.exports = { buildOpenApiSpec };
