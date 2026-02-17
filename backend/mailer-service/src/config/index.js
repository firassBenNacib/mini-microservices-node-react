const dotenv = require('dotenv');
const { parseBoolean } = require('../utils/parse-boolean');

dotenv.config();

const PLACEHOLDER_VALUES = new Set([
  'secret',
  'dev-password-placeholder',
  'dev-jwt-secret-placeholder',
  'dev-mailer-key-placeholder',
  'dev-notify-key-placeholder',
  'dev-audit-key-placeholder',
  'your-smtp-user',
  'your-smtp-password',
  'your-smtp-from@example.com',
]);

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseCorsOrigin(value) {
  if (!value || !String(value).trim()) {
    throw new Error('CORS_ORIGIN is required and cannot be blank');
  }

  const raw = String(value).trim();
  if (raw === '*') {
    throw new Error("CORS_ORIGIN wildcard '*' is not allowed");
  }

  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (!parts.length) {
    throw new Error('CORS_ORIGIN must contain at least one origin');
  }
  return parts;
}

function assertRequired(name, value) {
  if (!value || !String(value).trim()) {
    throw new Error(`${name} is required and cannot be blank`);
  }
}

function isPlaceholder(value) {
  const normalized = String(value).trim().toLowerCase();
  return (
    PLACEHOLDER_VALUES.has(normalized) ||
    normalized.includes('placeholder') ||
    normalized.startsWith('your-') ||
    normalized.includes('example.com') ||
    normalized.includes('replace-with')
  );
}

function assertSecret(name, value) {
  assertRequired(name, value);
  if (isPlaceholder(value)) {
    throw new Error(`${name} uses a placeholder value and must be replaced`);
  }
}

const config = {
  port: toNumber(process.env.PORT, 8083),
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  mailerApiKey: process.env.MAILER_API_KEY,
  smtp: {
    host: process.env.SMTP_HOST,
    port: toNumber(process.env.SMTP_PORT, 465),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: parseBoolean(process.env.SMTP_SECURE, true),
    from: process.env.SMTP_FROM,
  },
};

assertSecret('MAILER_API_KEY', config.mailerApiKey);
assertSecret('SMTP_HOST', config.smtp.host);
assertSecret('SMTP_USER', config.smtp.user);
assertSecret('SMTP_PASS', config.smtp.pass);
assertSecret('SMTP_FROM', config.smtp.from);

module.exports = { config };
