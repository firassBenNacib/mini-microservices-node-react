const jwt = require('jsonwebtoken');

function signToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn });
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

module.exports = { signToken, parseExpiresToSeconds };

