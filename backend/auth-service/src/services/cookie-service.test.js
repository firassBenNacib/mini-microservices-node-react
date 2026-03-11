const assert = require('node:assert/strict');
const test = require('node:test');

const { writeSessionCookies } = require('./cookie-service');

test('writeSessionCookies appends cookies when the response stores them without setHeader', () => {
  const response = {
    cookies: undefined,
    getHeader(name) {
      if (name !== 'Set-Cookie') {
        return undefined;
      }
      return this.cookies ?? 'legacy=1';
    },
  };

  writeSessionCookies(
    response,
    { cookie: { secure: false, sameSite: 'Lax' } },
    {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessMaxAge: 900,
      refreshMaxAge: 604800,
      csrfToken: 'csrf-token',
    },
  );

  assert.equal(Array.isArray(response.cookies), true);
  assert.equal(response.cookies.length, 4);
  assert.equal(response.cookies[0], 'legacy=1');
  assert.equal(response.cookies.some((value) => value.startsWith('auth_token=')), true);
  assert.equal(response.cookies.some((value) => value.startsWith('refresh_token=')), true);
  assert.equal(response.cookies.some((value) => value.startsWith('XSRF-TOKEN=')), true);
});
