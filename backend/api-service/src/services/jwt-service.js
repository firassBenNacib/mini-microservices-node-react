const jwt = require('jsonwebtoken');

function buildVerificationSecrets(config) {
  const secrets = [{ kid: config.currentKid, secret: config.currentSecret }];
  if (config.previousSecret) {
    secrets.push({ kid: 'previous-key', secret: config.previousSecret });
  }
  return secrets;
}

function verifyAccessToken(token, config) {
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
      if (claims.tokenType !== 'access') {
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

module.exports = { verifyAccessToken };
