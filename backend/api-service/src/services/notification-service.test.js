const assert = require('node:assert/strict');
const test = require('node:test');

function loadService() {
  delete require.cache[require.resolve('../config')];
  delete require.cache[require.resolve('./notification-service')];
  return require('./notification-service');
}

function setRequiredConfigEnv() {
  const originalEnv = {
    AUDIT_API_KEY: process.env.AUDIT_API_KEY,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    JWT_SECRET_CURRENT: process.env.JWT_SECRET_CURRENT,
    MAILER_API_KEY: process.env.MAILER_API_KEY,
    NOTIFY_API_KEY: process.env.NOTIFY_API_KEY,
  };

  process.env.CORS_ORIGIN = originalEnv.CORS_ORIGIN || 'http://localhost:3000';
  process.env.JWT_SECRET_CURRENT = originalEnv.JWT_SECRET_CURRENT || 'test-current-jwt-secret';
  process.env.MAILER_API_KEY = originalEnv.MAILER_API_KEY || 'test-mailer-key';
  process.env.NOTIFY_API_KEY = originalEnv.NOTIFY_API_KEY || 'test-notify-key';
  process.env.AUDIT_API_KEY = originalEnv.AUDIT_API_KEY || 'test-audit-key';

  return originalEnv;
}

test('postNotification forwards the payload to the notification service and clears the request timeout', async (t) => {
  const originalFetch = global.fetch;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const originalEnv = setRequiredConfigEnv();

  let request = null;
  let timeoutMs = null;
  const timeoutToken = { name: 'notification-timeout' };
  let clearedToken = null;
  const response = { ok: true, status: 202 };

  global.fetch = async (url, options) => {
    request = { url, options };
    return response;
  };
  global.setTimeout = (_fn, ms) => {
    timeoutMs = ms;
    return timeoutToken;
  };
  global.clearTimeout = (token) => {
    clearedToken = token;
  };

  t.after(() => {
    global.fetch = originalFetch;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    delete require.cache[require.resolve('../config')];
    delete require.cache[require.resolve('./notification-service')];
  });

  const { postNotification } = loadService();
  const result = await postNotification({ to: '+12025550123', text: 'Hello' });

  assert.equal(result, response);
  assert.equal(timeoutMs, 3000);
  assert.equal(clearedToken, timeoutToken);
  assert.match(request.url, /notification-service:8090\/notify$/);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.equal(typeof request.options.headers['x-notify-key'], 'string');
  assert.notEqual(request.options.headers['x-notify-key'].length, 0);
  assert.deepEqual(JSON.parse(request.options.body), {
    to: '+12025550123',
    text: 'Hello',
  });
  assert.equal(request.options.signal instanceof AbortSignal, true);
});
