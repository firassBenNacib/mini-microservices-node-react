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
  return signToken(
    { ...payload, tokenType: 'refresh' },
    config.currentSecret,
    config.refreshExpiresIn,
    config.currentKid,
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

  for (const candidate of candidates) {
    try {
      const claims = jwt.verify(token, candidate.secret);
      if (expectedType && claims.tokenType !== expectedType) {
        throw new Error('unexpected token type');
      }
      return claims;
    } catch (err) {
      continue;
    }
  }

  throw new Error('invalid token');
}

function parseExpiresToSeconds(input) {
  if (!input) return 3600;
  if (typeof input === 'number') return input;
  const value = String(input).trim();
  const match = value.match(/^(\d+)([smhd])?$/i);
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
