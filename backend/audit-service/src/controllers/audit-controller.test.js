const assert = require('node:assert/strict');
const test = require('node:test');

process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://127.0.0.1:8080';
process.env.JWT_SECRET_CURRENT = process.env.JWT_SECRET_CURRENT || 'test-jwt-secret-value';
process.env.AUDIT_API_KEY = process.env.AUDIT_API_KEY || 'test-audit-key';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test-db-password';

const auditEventService = require('../services/audit-event-service');

const controllerPath = require.resolve('./audit-controller');
const originalCreateEvent = auditEventService.createEvent;
const originalListRecent = auditEventService.listRecent;

function restoreStubs() {
  auditEventService.createEvent = originalCreateEvent;
  auditEventService.listRecent = originalListRecent;
  delete require.cache[controllerPath];
}

function loadController() {
  delete require.cache[controllerPath];
  return require('./audit-controller').createAuditController;
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('createEvent rejects invalid audit keys', async (t) => {
  t.after(restoreStubs);

  const createAuditController = loadController();
  const controller = createAuditController({ pool: {} });
  const response = createResponse();

  await controller.createEvent(
    {
      headers: { 'x-audit-key': 'wrong-key' },
      body: { eventType: 'LOGIN_SUCCESS' },
    },
    response
  );

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { error: 'invalid audit key' });
});

test('createEvent persists valid payloads and returns ok', async (t) => {
  t.after(restoreStubs);

  const calls = [];
  auditEventService.createEvent = async (_pool, payload) => {
    calls.push(payload);
  };

  const createAuditController = loadController();
  const controller = createAuditController({ pool: {} });
  const response = createResponse();

  await controller.createEvent(
    {
      headers: { 'x-audit-key': 'test-audit-key' },
      body: {
        eventType: 'LOGIN_SUCCESS',
        actor: 'user@example.com',
        details: 'ok',
        source: 'auth-service',
      },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { status: 'ok' });
  assert.deepEqual(calls, [
    {
      eventType: 'LOGIN_SUCCESS',
      actor: 'user@example.com',
      details: 'ok',
      source: 'auth-service',
    },
  ]);
});

test('recent clamps the limit and returns the service payload', async (t) => {
  t.after(restoreStubs);

  const calls = [];
  auditEventService.listRecent = async (_pool, limit) => {
    calls.push(limit);
    return [{ event_type: 'MESSAGE_VIEW' }];
  };

  const createAuditController = loadController();
  const controller = createAuditController({ pool: {} });
  const response = createResponse();

  await controller.recent({ query: { limit: '999' } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, [{ event_type: 'MESSAGE_VIEW' }]);
  assert.deepEqual(calls, [100]);
});
