const assert = require('node:assert/strict');
const test = require('node:test');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { buildOpenApiSpec } = require('./openapi');

test('buildOpenApiSpec returns a valid spec with the session endpoints', async () => {
  const spec = buildOpenApiSpec();
  const validated = await SwaggerParser.validate(spec);

  assert.equal(validated.openapi, '3.1.0');
  assert.ok(validated.paths['/auth/session']);
  assert.ok(validated.paths['/auth/refresh']);
  assert.ok(validated.paths['/auth/logout']);
});
