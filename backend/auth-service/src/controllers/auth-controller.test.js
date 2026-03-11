const assert = require('node:assert/strict');
const test = require('node:test');

process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://127.0.0.1:8080';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-value';
process.env.DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'test-password';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test-db-password';
process.env.AUDIT_API_KEY = process.env.AUDIT_API_KEY || 'test-audit-key';

const userService = require('../services/user-service');
const auditService = require('../services/audit-service');
const sessionService = require('../services/session-service');
const { signAccessToken, signRefreshToken } = require('../services/jwt-service');

const controllerPath = require.resolve('./auth-controller');
const originalFindUserByEmail = userService.findUserByEmail;
const originalVerifyPassword = userService.verifyPassword;
const originalSendAuditEvent = auditService.sendAuditEvent;
const originalCreateRefreshSession = sessionService.createRefreshSession;
const originalRevokeRefreshSession = sessionService.revokeRefreshSession;
const originalRotateRefreshSession = sessionService.rotateRefreshSession;

function restoreServiceStubs() {
  userService.findUserByEmail = originalFindUserByEmail;
  userService.verifyPassword = originalVerifyPassword;
  auditService.sendAuditEvent = originalSendAuditEvent;
  sessionService.createRefreshSession = originalCreateRefreshSession;
  sessionService.revokeRefreshSession = originalRevokeRefreshSession;
  sessionService.rotateRefreshSession = originalRotateRefreshSession;
  delete require.cache[controllerPath];
}

function loadController() {
  delete require.cache[controllerPath];
  return require('./auth-controller').createAuthController;
}

function createConfig() {
  return {
    jwt: {
      currentKid: 'active-key',
      currentSecret: 'test-jwt-secret-value',
      previousSecret: '',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
    },
    cookie: { secure: false, sameSite: 'Lax' },
  };
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

function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('login rejects requests with missing credentials', async (t) => {
  t.after(restoreServiceStubs);

  const createAuthController = loadController();
  const controller = createAuthController({
    config: createConfig(),
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
    config: createConfig(),
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

test('login still responds when the missing-user audit write fails', async (t) => {
  t.after(restoreServiceStubs);

  let warning = null;
  userService.findUserByEmail = async () => null;
  auditService.sendAuditEvent = async () => {
    throw new Error('audit unavailable');
  };

  const createAuthController = loadController();
  const controller = createAuthController({
    config: createConfig(),
    pool: {},
  });
  const response = createResponse();

  await controller.login(
    {
      body: { email: 'missing@example.com', password: 'secret' },
      log: {
        warn(payload, detail) {
          warning = { payload, detail };
        },
      },
    },
    response,
  );
  await flushMicrotasks();

  assert.equal(response.statusCode, 401);
  assert.equal(warning.detail, 'failed to write audit event');
  assert.equal(warning.payload.email, 'missing@example.com');
  assert.equal(warning.payload.err.message, 'audit unavailable');
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
    config: createConfig(),
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

test('login logs a warning when the success audit write fails', async (t) => {
  t.after(restoreServiceStubs);

  let warning = null;
  userService.findUserByEmail = async () => ({
    email: 'user@example.com',
    password_hash: 'hashed-password',
    role: 'admin',
  });
  userService.verifyPassword = async () => true;
  auditService.sendAuditEvent = async () => {
    throw new Error('audit unavailable');
  };

  const createAuthController = loadController();
  const controller = createAuthController({
    config: createConfig(),
    pool: {
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release: () => {},
      }),
    },
  });
  const response = createResponse();

  await controller.login(
    {
      body: { email: 'user@example.com', password: 'correct-password' },
      headers: {},
      log: {
        warn(payload, detail) {
          warning = { payload, detail };
        },
      },
    },
    response,
  );
  await flushMicrotasks();

  assert.equal(response.statusCode, 200);
  assert.equal(warning.detail, 'failed to write audit event');
  assert.equal(warning.payload.email, 'user@example.com');
  assert.equal(warning.payload.err.message, 'audit unavailable');
});

test('login logs a warning when the invalid-password audit write fails', async (t) => {
  t.after(restoreServiceStubs);

  let warning = null;
  userService.findUserByEmail = async () => ({
    email: 'user@example.com',
    password_hash: 'hashed-password',
    role: 'admin',
  });
  userService.verifyPassword = async () => false;
  auditService.sendAuditEvent = async () => {
    throw new Error('audit unavailable');
  };

  const createAuthController = loadController();
  const controller = createAuthController({
    config: createConfig(),
    pool: {},
  });
  const response = createResponse();

  await controller.login(
    {
      body: { email: 'user@example.com', password: 'wrong-password' },
      log: {
        warn(payload, detail) {
          warning = { payload, detail };
        },
      },
    },
    response,
  );
  await flushMicrotasks();

  assert.equal(response.statusCode, 401);
  assert.equal(warning.detail, 'failed to write audit event');
  assert.equal(warning.payload.email, 'user@example.com');
  assert.equal(warning.payload.err.message, 'audit unavailable');
});

test('session authenticates from the bearer header without rewriting cookies', async (t) => {
  t.after(restoreServiceStubs);

  const config = createConfig();
  const createAuthController = loadController();
  const controller = createAuthController({ config, pool: {} });
  const response = createResponse();
  const accessToken = signAccessToken({ sub: 'user@example.com', role: 'admin' }, config.jwt);

  await controller.session(
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
        cookie: 'XSRF-TOKEN=existing-token',
      },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    authenticated: true,
    expiresIn: 900,
    user: { email: 'user@example.com', role: 'admin' },
  });
  assert.equal(response.getHeader('Set-Cookie'), undefined);
});

test('session returns an anonymous response and issues a csrf cookie when the token is invalid', async (t) => {
  t.after(restoreServiceStubs);

  const createAuthController = loadController();
  const controller = createAuthController({ config: createConfig(), pool: {} });
  const response = createResponse();

  await controller.session({ headers: { authorization: 'Bearer invalid-token' } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    authenticated: false,
    expiresIn: 900,
    user: null,
  });
  assert.equal(Array.isArray(response.getHeader('Set-Cookie')), true);
  assert.equal(
    response.getHeader('Set-Cookie').some((value) => value.startsWith('XSRF-TOKEN=')),
    true,
  );
});

test('refresh rejects requests when the csrf token does not match', async (t) => {
  t.after(restoreServiceStubs);

  const createAuthController = loadController();
  const controller = createAuthController({ config: createConfig(), pool: {} });
  const response = createResponse();

  await controller.refresh(
    {
      headers: {
        cookie: 'refresh_token=refresh-value; XSRF-TOKEN=cookie-token',
        'x-xsrf-token': 'header-token',
      },
    },
    response,
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: 'csrf token mismatch' });
});

test('refresh rotates the refresh session and rewrites auth cookies', async (t) => {
  t.after(restoreServiceStubs);

  const config = createConfig();
  const rotatedSessions = [];
  sessionService.rotateRefreshSession = async (pool, payload) => {
    rotatedSessions.push({ pool, payload });
    return true;
  };
  const createAuthController = loadController();
  const controller = createAuthController({ config, pool: { name: 'auth-pool' } });
  const response = createResponse();
  const refreshToken = signRefreshToken({ sub: 'user@example.com', role: 'admin' }, config.jwt);

  await controller.refresh(
    {
      headers: {
        cookie: `refresh_token=${refreshToken}; XSRF-TOKEN=csrf-token`,
        'x-xsrf-token': 'csrf-token',
      },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.authenticated, true);
  assert.equal(response.body.user.email, 'user@example.com');
  assert.equal(rotatedSessions.length, 1);
  assert.equal(rotatedSessions[0].pool.name, 'auth-pool');
  assert.equal(rotatedSessions[0].payload.userEmail, 'user@example.com');
  assert.equal(rotatedSessions[0].payload.currentRefreshToken, refreshToken);
  assert.notEqual(rotatedSessions[0].payload.nextRefreshToken, refreshToken);
  assert.equal(rotatedSessions[0].payload.expiresAt instanceof Date, true);
  assert.equal(Array.isArray(response.getHeader('Set-Cookie')), true);
  assert.equal(
    response.getHeader('Set-Cookie').some((value) => value.startsWith('auth_token=')),
    true,
  );
  assert.equal(
    response.getHeader('Set-Cookie').some((value) => value.startsWith('refresh_token=')),
    true,
  );
});

test('refresh clears the session when rotation cannot find an active token', async (t) => {
  t.after(restoreServiceStubs);

  const config = createConfig();
  sessionService.rotateRefreshSession = async () => false;
  const createAuthController = loadController();
  const controller = createAuthController({ config, pool: {} });
  const response = createResponse();
  const refreshToken = signRefreshToken({ sub: 'user@example.com', role: 'admin' }, config.jwt);

  await controller.refresh(
    {
      headers: {
        cookie: `refresh_token=${refreshToken}; XSRF-TOKEN=csrf-token`,
        'x-xsrf-token': 'csrf-token',
      },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    authenticated: false,
    expiresIn: 900,
    user: null,
  });
  assert.equal(Array.isArray(response.getHeader('Set-Cookie')), true);
  assert.equal(
    response.getHeader('Set-Cookie').every((value) => value.includes('Max-Age=0')),
    true,
  );
});

test('refresh clears the session when the refresh token is invalid', async (t) => {
  t.after(restoreServiceStubs);

  const createAuthController = loadController();
  const controller = createAuthController({ config: createConfig(), pool: {} });
  const response = createResponse();

  await controller.refresh(
    {
      headers: {
        cookie: 'refresh_token=invalid-token; XSRF-TOKEN=csrf-token',
        'x-xsrf-token': 'csrf-token',
      },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    authenticated: false,
    expiresIn: 900,
    user: null,
  });
  assert.equal(
    response.getHeader('Set-Cookie').every((value) => value.includes('Max-Age=0')),
    true,
  );
});

test('logout rejects requests when the csrf token does not match', async (t) => {
  t.after(restoreServiceStubs);

  const createAuthController = loadController();
  const controller = createAuthController({ config: createConfig(), pool: {} });
  const response = createResponse();

  await controller.logout(
    {
      headers: {
        cookie: 'refresh_token=refresh-token; XSRF-TOKEN=cookie-token',
        'x-xsrf-token': 'header-token',
      },
    },
    response,
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: 'csrf token mismatch' });
});

test('logout revokes the refresh session and clears cookies', async (t) => {
  t.after(restoreServiceStubs);

  const revoked = [];
  sessionService.revokeRefreshSession = async (pool, refreshToken) => {
    revoked.push({ pool, refreshToken });
  };
  const createAuthController = loadController();
  const controller = createAuthController({ config: createConfig(), pool: { name: 'auth-pool' } });
  const response = createResponse();

  await controller.logout(
    {
      headers: {
        cookie: 'refresh_token=refresh-token; XSRF-TOKEN=csrf-token',
        'x-xsrf-token': 'csrf-token',
      },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { status: 'ok' });
  assert.deepEqual(revoked, [{ pool: { name: 'auth-pool' }, refreshToken: 'refresh-token' }]);
  assert.equal(
    response.getHeader('Set-Cookie').every((value) => value.includes('Max-Age=0')),
    true,
  );
});
