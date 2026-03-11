import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureSession, login, logout, sessionFetch } from './auth.js';

test('login uses cookie credentials instead of returning a local token', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/auth/login');
    assert.equal(options.credentials, 'include');
    assert.equal(options.method, 'POST');
    return {
      ok: true,
      async json() {
        return { authenticated: true, expiresIn: 900, user: { email: 'user@example.com' } };
      },
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const session = await login('user@example.com', 'secret');

  assert.equal(session.authenticated, true);
  assert.deepEqual(session.user, { email: 'user@example.com' });
});

test('ensureSession falls back to refresh when the access cookie is missing', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url === '/auth/session') {
      return {
        ok: true,
        async json() {
          return { authenticated: false, user: null, expiresIn: 900 };
        },
      };
    }

    return {
      ok: true,
      async json() {
        return { authenticated: true, user: { email: 'user@example.com' }, expiresIn: 900 };
      },
    };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const session = await ensureSession();

  assert.deepEqual(calls, ['/auth/session', '/auth/refresh']);
  assert.equal(session.authenticated, true);
});

test('sessionFetch sends the CSRF header and retries once after a refresh', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  const requests = [];

  globalThis.document = { cookie: 'XSRF-TOKEN=test-xsrf-token' };
  globalThis.fetch = async (url, options) => {
    requests.push({
      url,
      method: options.method,
      csrf: new Headers(options.headers).get('X-XSRF-TOKEN'),
    });

    if (url === '/api/send-test-email' && requests.filter((request) => request.url === url).length === 1) {
      return { ok: false, status: 401 };
    }
    if (url === '/auth/refresh') {
      return {
        ok: true,
        async json() {
          return { authenticated: true, user: { email: 'user@example.com' }, expiresIn: 900 };
        },
      };
    }

    return { ok: true, status: 200 };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
  });

  const response = await sessionFetch('/api/send-test-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: 'user@example.com' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(requests, [
    { url: '/api/send-test-email', method: 'POST', csrf: 'test-xsrf-token' },
    { url: '/auth/refresh', method: 'POST', csrf: 'test-xsrf-token' },
    { url: '/api/send-test-email', method: 'POST', csrf: 'test-xsrf-token' },
  ]);
});

test('logout posts through the cookie session endpoint', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  globalThis.document = { cookie: 'XSRF-TOKEN=test-xsrf-token' };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/auth/logout');
    assert.equal(options.credentials, 'include');
    assert.equal(new Headers(options.headers).get('X-XSRF-TOKEN'), 'test-xsrf-token');
    return { ok: true };
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
  });

  await logout();
});
