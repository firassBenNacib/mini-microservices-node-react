const { sendAuditEvent } = require('../services/audit-service');
const { signToken, parseExpiresToSeconds } = require('../services/jwt-service');
const { findUserByEmail, verifyPassword } = require('../services/user-service');

function createAuthController({ config, pool }) {
  function health(req, res) {
    res.json({ status: 'ok' });
  }

  async function login(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
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
        return res.status(401).json({ error: 'invalid credentials' });
      }

      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        sendAuditEvent({
          eventType: 'LOGIN_FAILURE',
          actor: email,
          details: 'invalid password',
          source: 'auth-service',
        }).catch(() => {});
        return res.status(401).json({ error: 'invalid credentials' });
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
      return res.status(500).json({ error: 'internal error' });
    }
  }

  return { health, login };
}

module.exports = { createAuthController };

