import assert from 'node:assert/strict';
import test from 'node:test';

import { probeHealthEndpoint } from './api.js';

test('probeHealthEndpoint reports service health when the endpoint is up', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return { status: 'ok' };
    },
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await probeHealthEndpoint('/gateway/health');

  assert.deepEqual(result, { state: 'up', detail: 'ok' });
});

test('probeHealthEndpoint reports a down state for non-2xx responses', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await probeHealthEndpoint('/gateway/health');

  assert.deepEqual(result, { state: 'down', detail: 'HTTP 503' });
});

test('probeHealthEndpoint reports unknown when the request throws', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('network failure');
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await probeHealthEndpoint('/gateway/health');

  assert.deepEqual(result, { state: 'unknown', detail: 'unreachable or timeout' });
});

test('probeHealthEndpoint falls back to ok when the response body cannot be parsed', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      throw new Error('invalid json');
    },
  });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await probeHealthEndpoint('/gateway/health');

  assert.deepEqual(result, { state: 'up', detail: 'ok' });
});
