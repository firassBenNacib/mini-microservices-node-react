const assert = require('node:assert/strict');
const test = require('node:test');
const { parseExpiresToSeconds, signAccessToken, signRefreshToken, verifyToken } = require('./jwt-service');

test('parseExpiresToSeconds handles shorthand durations', () => {
  assert.equal(parseExpiresToSeconds(), 3600);
  assert.equal(parseExpiresToSeconds('45'), 45);
  assert.equal(parseExpiresToSeconds('15m'), 900);
  assert.equal(parseExpiresToSeconds('2h'), 7200);
  assert.equal(parseExpiresToSeconds('1d'), 86400);
  assert.equal(parseExpiresToSeconds('invalid'), 3600);
});

test('access and refresh tokens encode the expected claims and types', () => {
  const config = {
    currentKid: 'active-key',
    currentSecret: 'super-secret-value',
    previousSecret: '',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  };

  const accessToken = signAccessToken({ sub: 'user@example.com', role: 'admin' }, config);
  const refreshToken = signRefreshToken({ sub: 'user@example.com', role: 'admin' }, config);

  const accessClaims = verifyToken(accessToken, config, 'access');
  const refreshClaims = verifyToken(refreshToken, config, 'refresh');

  assert.equal(accessClaims.sub, 'user@example.com');
  assert.equal(accessClaims.role, 'admin');
  assert.equal(refreshClaims.tokenType, 'refresh');
});

test('refresh tokens are unique across consecutive rotations', () => {
  const config = {
    currentKid: 'active-key',
    currentSecret: 'super-secret-value',
    previousSecret: '',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  };

  const firstRefreshToken = signRefreshToken({ sub: 'user@example.com', role: 'admin' }, config);
  const secondRefreshToken = signRefreshToken({ sub: 'user@example.com', role: 'admin' }, config);

  assert.notEqual(firstRefreshToken, secondRefreshToken);
});

test('verifyToken falls back to the previous secret when the current key fails verification', () => {
  const config = {
    currentKid: 'active-key',
    currentSecret: 'current-secret-value',
    previousSecret: 'previous-secret-value',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  };

  const accessToken = require('jsonwebtoken').sign(
    { sub: 'user@example.com', role: 'admin', tokenType: 'access' },
    config.previousSecret,
    { header: { kid: config.currentKid } },
  );

  const claims = verifyToken(accessToken, config, 'access');

  assert.equal(claims.sub, 'user@example.com');
  assert.equal(claims.role, 'admin');
});

test('verifyToken rethrows unexpected token type errors', () => {
  const config = {
    currentKid: 'active-key',
    currentSecret: 'super-secret-value',
    previousSecret: '',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  };

  const refreshToken = signRefreshToken({ sub: 'user@example.com', role: 'admin' }, config);

  assert.throws(
    () => verifyToken(refreshToken, config, 'access'),
    /unexpected token type/,
  );
});
