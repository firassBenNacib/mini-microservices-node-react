const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  createRefreshSession,
  revokeRefreshSession,
  rotateRefreshSession,
} = require('./session-service');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createClient(queryImpl) {
  const calls = [];
  return {
    calls,
    released: false,
    async query(sql, params) {
      calls.push({ sql, params });
      return queryImpl ? queryImpl(sql, params, calls) : { rows: [] };
    },
    release() {
      this.released = true;
    },
  };
}

test('createRefreshSession revokes existing sessions and stores the new refresh token hash', async () => {
  const client = createClient();
  const pool = {
    async connect() {
      return client;
    },
  };
  const expiresAt = new Date('2026-03-18T00:00:00.000Z');

  await createRefreshSession(pool, {
    userEmail: 'user@example.com',
    refreshToken: 'refresh-token',
    expiresAt,
  });

  assert.deepEqual(
    client.calls.map(({ sql }) => sql.trim()),
    [
      'BEGIN',
      `UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_email = $1
        AND revoked_at IS NULL`,
      `INSERT INTO refresh_tokens (user_email, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
      'COMMIT',
    ],
  );
  assert.deepEqual(client.calls[1].params, ['user@example.com']);
  assert.deepEqual(client.calls[2].params, ['user@example.com', hashToken('refresh-token'), expiresAt]);
  assert.equal(client.released, true);
});

test('createRefreshSession rolls back the transaction when token storage fails', async () => {
  const failure = new Error('insert failed');
  const client = createClient((sql) => {
    if (sql.includes('INSERT INTO refresh_tokens')) {
      throw failure;
    }
    return { rows: [] };
  });
  const pool = {
    async connect() {
      return client;
    },
  };

  await assert.rejects(
    () =>
      createRefreshSession(pool, {
        userEmail: 'user@example.com',
        refreshToken: 'refresh-token',
        expiresAt: new Date('2026-03-18T00:00:00.000Z'),
      }),
    failure,
  );

  assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(client.released, true);
});

test('rotateRefreshSession returns false when there is no active session to rotate', async () => {
  const client = createClient((sql) => {
    if (sql.includes('SELECT id')) {
      return { rows: [] };
    }
    return { rows: [] };
  });
  const pool = {
    async connect() {
      return client;
    },
  };

  const rotated = await rotateRefreshSession(pool, {
    userEmail: 'user@example.com',
    currentRefreshToken: 'current-token',
    nextRefreshToken: 'next-token',
    expiresAt: new Date('2026-03-18T00:00:00.000Z'),
  });

  assert.equal(rotated, false);
  assert.deepEqual(
    client.calls.map(({ sql }) => sql.trim()),
    [
      'BEGIN',
      `SELECT id
         FROM refresh_tokens
        WHERE token_hash = $1
          AND user_email = $2
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1`,
      'ROLLBACK',
    ],
  );
  assert.equal(client.released, true);
});

test('rotateRefreshSession revokes the current token and stores the rotated token', async () => {
  const client = createClient((sql) => {
    if (sql.includes('SELECT id')) {
      return { rows: [{ id: 42 }] };
    }
    return { rows: [] };
  });
  const pool = {
    async connect() {
      return client;
    },
  };
  const expiresAt = new Date('2026-03-18T00:00:00.000Z');

  const rotated = await rotateRefreshSession(pool, {
    userEmail: 'user@example.com',
    currentRefreshToken: 'current-token',
    nextRefreshToken: 'next-token',
    expiresAt,
  });

  assert.equal(rotated, true);
  assert.deepEqual(client.calls[1].params, [hashToken('current-token'), 'user@example.com']);
  assert.deepEqual(client.calls[2].params, [42]);
  assert.deepEqual(client.calls[3].params, ['user@example.com', hashToken('next-token'), expiresAt]);
  assert.equal(client.calls.at(-1).sql, 'COMMIT');
  assert.equal(client.released, true);
});

test('rotateRefreshSession rolls back the transaction when the replacement token cannot be stored', async () => {
  const failure = new Error('replace failed');
  const client = createClient((sql) => {
    if (sql.includes('SELECT id')) {
      return { rows: [{ id: 42 }] };
    }
    if (sql.includes('INSERT INTO refresh_tokens')) {
      throw failure;
    }
    return { rows: [] };
  });
  const pool = {
    async connect() {
      return client;
    },
  };

  await assert.rejects(
    () =>
      rotateRefreshSession(pool, {
        userEmail: 'user@example.com',
        currentRefreshToken: 'current-token',
        nextRefreshToken: 'next-token',
        expiresAt: new Date('2026-03-18T00:00:00.000Z'),
      }),
    failure,
  );

  assert.equal(client.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(client.released, true);
});

test('revokeRefreshSession ignores blank refresh tokens', async () => {
  let called = false;
  const pool = {
    async query() {
      called = true;
      return { rows: [] };
    },
  };

  await revokeRefreshSession(pool, '');

  assert.equal(called, false);
});

test('revokeRefreshSession hashes the refresh token before revoking it', async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await revokeRefreshSession(pool, 'refresh-token');

  assert.deepEqual(calls, [
    {
      sql: `UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1
        AND revoked_at IS NULL`,
      params: [hashToken('refresh-token')],
    },
  ]);
});
