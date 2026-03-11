const crypto = require('node:crypto');
const cookie = require('cookie');

const AUTH_COOKIE_NAME = 'auth_token';
const REFRESH_COOKIE_NAME = 'refresh_token';
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';

function parseCookies(req) {
  return cookie.parse(req.headers?.cookie || '');
}

function readCookie(req, name) {
  return parseCookies(req)[name] || '';
}

function serializeCookie(name, value, { httpOnly, secure, sameSite, maxAge }) {
  return cookie.serialize(name, value, {
    httpOnly,
    secure,
    sameSite,
    path: '/',
    maxAge,
  });
}

function appendSetCookie(res, value) {
  const current = res.getHeader ? res.getHeader('Set-Cookie') : undefined;
  let next = [value];
  if (Array.isArray(current)) {
    next = [...current, value];
  } else if (current) {
    next = [current, value];
  }

  if (res.setHeader) {
    res.setHeader('Set-Cookie', next);
  } else {
    res.cookies = next;
  }
}

function issueCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

function ensureCsrfCookie(req, res, config, maxAge) {
  const existing = readCookie(req, CSRF_COOKIE_NAME);
  if (existing) {
    return existing;
  }

  const csrfToken = issueCsrfToken();
  appendSetCookie(
    res,
    serializeCookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge,
    }),
  );
  return csrfToken;
}

function writeSessionCookies(res, config, { accessToken, refreshToken, accessMaxAge, refreshMaxAge, csrfToken }) {
  appendSetCookie(
    res,
    serializeCookie(AUTH_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge: accessMaxAge,
    }),
  );
  appendSetCookie(
    res,
    serializeCookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge: refreshMaxAge,
    }),
  );
  appendSetCookie(
    res,
    serializeCookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge: refreshMaxAge,
    }),
  );
}

function clearSessionCookies(res, config) {
  const cookieOptions = {
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: 0,
  };
  appendSetCookie(res, serializeCookie(AUTH_COOKIE_NAME, '', { ...cookieOptions, httpOnly: true }));
  appendSetCookie(res, serializeCookie(REFRESH_COOKIE_NAME, '', { ...cookieOptions, httpOnly: true }));
  appendSetCookie(res, serializeCookie(CSRF_COOKIE_NAME, '', { ...cookieOptions, httpOnly: false }));
}

function verifyCsrfRequest(req) {
  const csrfCookie = readCookie(req, CSRF_COOKIE_NAME);
  const csrfHeader = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'] || '';
  return Boolean(csrfCookie) && csrfCookie === csrfHeader;
}

module.exports = {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearSessionCookies,
  ensureCsrfCookie,
  parseCookies,
  readCookie,
  verifyCsrfRequest,
  writeSessionCookies,
};
