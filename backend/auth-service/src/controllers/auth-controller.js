const { sendAuditEvent } = require('../services/audit-service');
const { signToken, parseExpiresToSeconds } = require('../services/jwt-service');
const { findUserByEmail, verifyPassword } = require('../services/user-service');
const { handleUnexpectedError, sendProblem } = require('../http/problem-response');

function createAuthController({ config, pool }) {
  function health(req, res) {
    res.json({ status: 'ok' });
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

      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        sendAuditEvent({
          eventType: 'LOGIN_FAILURE',
          actor: email,
          details: 'invalid password',
          source: 'auth-service',
        }).catch(() => {});
        return sendProblem(res, 401, 'invalid credentials');
      }

      const payload = { sub: user.email, role: user.role };
      const token = signToken(payload, config.jwt.secret, config.jwt.expiresIn);
      const expiresIn = parseExpiresToSeconds(config.jwt.expiresIn);

      sendAuditEvent({
        eventType: 'LOGIN_SUCCESS',
        actor: user.email,
        details: 'login successful',
        source: 'auth-service',
      }).catch(() => {});

      return res.json({
        token,
        expiresIn,
        user: { email: user.email, role: user.role },
      });
    } catch (err) {
      return handleUnexpectedError(req, res, err, 'auth login error');
    }
  }

  return { health, login };
}

module.exports = { createAuthController };
