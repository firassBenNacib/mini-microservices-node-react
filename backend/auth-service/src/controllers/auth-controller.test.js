const assert = require('node:assert/strict');
const test = require('node:test');

process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://127.0.0.1:8080';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-value';
process.env.DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'test-password';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test-db-password';
process.env.AUDIT_API_KEY = process.env.AUDIT_API_KEY || 'test-audit-key';

const userService = require('../services/user-service');
const auditService = require('../services/audit-service');

const controllerPath = require.resolve('./auth-controller');
const originalFindUserByEmail = userService.findUserByEmail;
const originalVerifyPassword = userService.verifyPassword;
const originalSendAuditEvent = auditService.sendAuditEvent;

function restoreServiceStubs() {
  userService.findUserByEmail = originalFindUserByEmail;
  userService.verifyPassword = originalVerifyPassword;
  auditService.sendAuditEvent = originalSendAuditEvent;
  delete require.cache[controllerPath];
}

function loadController() {
  delete require.cache[controllerPath];
  return require('./auth-controller').createAuthController;
}

function createResponse() {
  return {
    headers: new Map(),
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers.set(name, value);
      return this;
    },
    getHeader(name) {
      return this.headers.get(name);
    },
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

test('login rejects requests with missing credentials', async (t) => {
  t.after(restoreServiceStubs);

  const createAuthController = loadController();
  const controller = createAuthController({
    config: {
      jwt: {
        currentKid: 'active-key',
        currentSecret: 'test-jwt-secret-value',
        previousSecret: '',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
      },
      cookie: { secure: false, sameSite: 'Lax' },
    },
    pool: {},
  });
  const response = createResponse();

  await controller.login({ body: { email: '' } }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'email and password are required' });
});

test('login returns 401 and audits when the user is missing', async (t) => {
  t.after(restoreServiceStubs);

  const auditEvents = [];
  userService.findUserByEmail = async () => null;
  auditService.sendAuditEvent = async (payload) => {
    auditEvents.push(payload);
  };

  const createAuthController = loadController();
  const controller = createAuthController({
    config: {
      jwt: {
        currentKid: 'active-key',
        currentSecret: 'test-jwt-secret-value',
        previousSecret: '',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
      },
      cookie: { secure: false, sameSite: 'Lax' },
    },
    pool: {},
  });
  const response = createResponse();

  await controller.login({ body: { email: 'missing@example.com', password: 'secret' } }, response);

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { error: 'invalid credentials' });
  assert.deepEqual(auditEvents, [
    {
      eventType: 'LOGIN_FAILURE',
      actor: 'missing@example.com',
      details: 'user not found',
      source: 'auth-service',
    },
  ]);
});

test('login returns an authenticated session and sets session cookies', async (t) => {
  t.after(restoreServiceStubs);

  const auditEvents = [];
  userService.findUserByEmail = async () => ({
    email: 'user@example.com',
    password_hash: 'hashed-password',
    role: 'admin',
  });
  userService.verifyPassword = async () => true;
  auditService.sendAuditEvent = async (payload) => {
    auditEvents.push(payload);
  };

  const createAuthController = loadController();
  const controller = createAuthController({
    config: {
      jwt: {
        currentKid: 'active-key',
        currentSecret: 'test-jwt-secret-value',
        previousSecret: '',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
      },
      cookie: { secure: false, sameSite: 'Lax' },
    },
    pool: {
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release: () => {},
      }),
    },
  });
  const response = createResponse();

  await controller.login(
    { body: { email: 'user@example.com', password: 'correct-password' }, headers: {} },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.authenticated, true);
  assert.equal(response.body.user.email, 'user@example.com');
  assert.equal(response.body.user.role, 'admin');
  assert.equal(response.body.expiresIn, 900);
  assert.equal(Array.isArray(response.getHeader('Set-Cookie')), true);
  assert.equal(auditEvents.length, 1);
  assert.deepEqual(auditEvents[0], {
    eventType: 'LOGIN_SUCCESS',
    actor: 'user@example.com',
    details: 'login successful',
    source: 'auth-service',
  });
});
