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
