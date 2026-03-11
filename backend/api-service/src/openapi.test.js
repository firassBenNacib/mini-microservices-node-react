const assert = require('node:assert/strict');
const test = require('node:test');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { buildOpenApiSpec } = require('./openapi');

test('buildOpenApiSpec returns a valid spec with protected routes', async () => {
  const spec = buildOpenApiSpec();
  const validated = await SwaggerParser.validate(spec);

  assert.equal(validated.openapi, '3.1.0');
  assert.ok(validated.paths['/api/message']);
  assert.ok(validated.paths['/api/send-test-email']);
  assert.ok(validated.paths['/api/send-test-notification']);
});
