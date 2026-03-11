const {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearSessionCookies,
  ensureCsrfCookie,
  readCookie,
  verifyCsrfRequest,
  writeSessionCookies,
} = require('../services/cookie-service');
const { sendAuditEvent } = require('../services/audit-service');
const { parseExpiresToSeconds, signAccessToken, signRefreshToken, verifyToken } = require('../services/jwt-service');
const { createRefreshSession, revokeRefreshSession, rotateRefreshSession } = require('../services/session-service');
const { findUserByEmail, verifyPassword } = require('../services/user-service');
const { handleUnexpectedError, sendProblem } = require('../http/problem-response');

function createAuthController({ config, pool }) {
  function health(req, res) {
    res.json({ status: 'ok' });
  }

  function sessionResponse(authenticated, user) {
    return {
      authenticated,
      expiresIn: parseExpiresToSeconds(config.jwt.expiresIn),
      user: authenticated ? user : null,
    };
  }

  function resolveAuthenticatedUser(req) {
    const authHeader = req.headers.authorization || '';
    const [, bearerToken] = authHeader.split(' ');
    const accessToken = bearerToken || readCookie(req, AUTH_COOKIE_NAME);
    if (!accessToken) {
      return null;
    }

    const claims = verifyToken(accessToken, config.jwt, 'access');
    return {
      email: claims.sub,
      role: claims.role,
    };
  }

  function writeAuthenticatedSession(req, res, user, refreshToken) {
    const csrfToken = ensureCsrfCookie(
      req,
      res,
      config,
      parseExpiresToSeconds(config.jwt.refreshExpiresIn),
    );

    writeSessionCookies(res, config, {
      accessToken: signAccessToken({ sub: user.email, role: user.role }, config.jwt),
      refreshToken,
      accessMaxAge: parseExpiresToSeconds(config.jwt.expiresIn),
      refreshMaxAge: parseExpiresToSeconds(config.jwt.refreshExpiresIn),
      csrfToken,
    });

    return sessionResponse(true, { email: user.email, role: user.role });
  }

  async function session(req, res) {
    try {
      ensureCsrfCookie(req, res, config, parseExpiresToSeconds(config.jwt.refreshExpiresIn));
      const user = resolveAuthenticatedUser(req);
      return res.json(sessionResponse(Boolean(user), user));
    } catch (err) {
      return res.json(sessionResponse(false));
    }
  }

  async function login(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return sendProblem(res, 400, 'email and password are required');
    }

    try {
      const user = await findUserByEmail(pool, email);
      if (!user) {
        sendAuditEvent({
          eventType: 'LOGIN_FAILURE',
          actor: email,
          details: 'user not found',
          source: 'auth-service',
        }).catch(() => {});
        return sendProblem(res, 401, 'invalid credentials');
      }

      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        sendAuditEvent({
          eventType: 'LOGIN_FAILURE',
          actor: email,
          details: 'invalid password',
          source: 'auth-service',
        }).catch(() => {});
        return sendProblem(res, 401, 'invalid credentials');
      }

      const refreshToken = signRefreshToken({ sub: user.email, role: user.role }, config.jwt);
      await createRefreshSession(pool, {
        userEmail: user.email,
        refreshToken,
        expiresAt: new Date(Date.now() + parseExpiresToSeconds(config.jwt.refreshExpiresIn) * 1000),
      });

      sendAuditEvent({
        eventType: 'LOGIN_SUCCESS',
        actor: user.email,
        details: 'login successful',
        source: 'auth-service',
      }).catch(() => {});

      return res.json(writeAuthenticatedSession(req, res, user, refreshToken));
    } catch (err) {
      return handleUnexpectedError(req, res, err, 'auth login error');
    }
  }

  async function refresh(req, res) {
    if (!verifyCsrfRequest(req)) {
      return sendProblem(res, 403, 'csrf token mismatch');
    }

    const refreshToken = readCookie(req, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      clearSessionCookies(res, config);
      return res.json(sessionResponse(false));
    }

    try {
      const claims = verifyToken(refreshToken, config.jwt, 'refresh');
      const nextRefreshToken = signRefreshToken({ sub: claims.sub, role: claims.role }, config.jwt);
      const rotated = await rotateRefreshSession(pool, {
        userEmail: claims.sub,
        currentRefreshToken: refreshToken,
        nextRefreshToken,
        expiresAt: new Date(Date.now() + parseExpiresToSeconds(config.jwt.refreshExpiresIn) * 1000),
      });

      if (!rotated) {
        clearSessionCookies(res, config);
        return res.json(sessionResponse(false));
      }

      return res.json(
        writeAuthenticatedSession(
          req,
          res,
          { email: claims.sub, role: claims.role },
          nextRefreshToken,
        ),
      );
    } catch (err) {
      clearSessionCookies(res, config);
      return res.json(sessionResponse(false));
    }
  }

  async function logout(req, res) {
    if (!verifyCsrfRequest(req)) {
      return sendProblem(res, 403, 'csrf token mismatch');
    }

    try {
      await revokeRefreshSession(pool, readCookie(req, REFRESH_COOKIE_NAME));
      clearSessionCookies(res, config);
      return res.json({ status: 'ok' });
    } catch (err) {
      return handleUnexpectedError(req, res, err, 'auth logout error');
    }
  }

  return { health, login, logout, refresh, session };
}

module.exports = { createAuthController };
