const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');

const { verifyAccessToken } = require('./jwt-service');

test('verifyAccessToken falls back to the previous secret when the current key fails verification', () => {
  const config = {
    currentKid: 'active-key',
    currentSecret: 'current-secret-value',
    previousSecret: 'previous-secret-value',
  };

  const token = jwt.sign(
    { sub: 'user@example.com', role: 'admin', tokenType: 'access' },
    config.previousSecret,
    { header: { kid: config.currentKid } },
  );

  const claims = verifyAccessToken(token, config);

  assert.equal(claims.sub, 'user@example.com');
  assert.equal(claims.role, 'admin');
});

test('verifyAccessToken rethrows unexpected token type errors', () => {
  const config = {
    currentKid: 'active-key',
    currentSecret: 'current-secret-value',
    previousSecret: '',
  };

  const token = jwt.sign(
    { sub: 'user@example.com', role: 'admin', tokenType: 'refresh' },
    config.currentSecret,
    { header: { kid: config.currentKid } },
  );

  assert.throws(() => verifyAccessToken(token, config), /unexpected token type/);
});
