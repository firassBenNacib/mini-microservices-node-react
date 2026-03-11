const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

function buildVerificationSecrets(config) {
  const secrets = [
    { kid: config.currentKid, secret: config.currentSecret },
  ];
  if (config.previousSecret) {
    secrets.push({ kid: 'previous-key', secret: config.previousSecret });
  }
  return secrets;
}

function signToken(payload, secret, expiresIn, kid) {
  return jwt.sign(payload, secret, {
    expiresIn,
    header: { kid },
  });
}

function signAccessToken(payload, config) {
  return signToken({ ...payload, tokenType: 'access' }, config.currentSecret, config.expiresIn, config.currentKid);
}

function signRefreshToken(payload, config) {
  return jwt.sign(
    { ...payload, tokenType: 'refresh' },
    config.currentSecret,
    {
      expiresIn: config.refreshExpiresIn,
      header: { kid: config.currentKid },
      jwtid: crypto.randomUUID(),
    },
  );
}

function verifyToken(token, config, expectedType) {
  const decoded = jwt.decode(token, { complete: true }) || {};
  const headerKid = decoded.header?.kid;
  const candidates = buildVerificationSecrets(config).sort((left, right) => {
    if (left.kid === headerKid) return -1;
    if (right.kid === headerKid) return 1;
    return 0;
  });
  let lastVerificationError = null;

  for (const candidate of candidates) {
    try {
      const claims = jwt.verify(token, candidate.secret);
      if (expectedType && claims.tokenType !== expectedType) {
        throw new Error('unexpected token type');
      }
      return claims;
    } catch (err) {
      if (!(err instanceof jwt.JsonWebTokenError) && !(err instanceof jwt.NotBeforeError)) {
        throw err;
      }
      lastVerificationError = err;
      continue;
    }
  }

  throw lastVerificationError || new Error('invalid token');
}

function parseExpiresToSeconds(input) {
  if (!input) return 3600;
  if (typeof input === 'number') return input;
  const value = String(input).trim();
  const match = /^(\d+)([smhd])?$/i.exec(value);
  if (!match) return 3600;
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      return amount;
  }
}

module.exports = {
  parseExpiresToSeconds,
  signAccessToken,
  signRefreshToken,
  verifyToken,
};
