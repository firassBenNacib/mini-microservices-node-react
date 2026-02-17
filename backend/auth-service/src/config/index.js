const dotenv = require('dotenv');

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
  port: toNumber(process.env.PORT, 8081),
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  demoUser: {
    email: process.env.DEFAULT_USER_EMAIL || 'admin@example.com',
    password: process.env.DEFAULT_USER_PASSWORD,
  },
  db: {
    host: process.env.DB_HOST || 'postgres',
    port: toNumber(process.env.DB_PORT, 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME || 'devops_demo',
  },
  audit: {
    url: process.env.AUDIT_URL || 'http://audit-service:8084/audit/events',
    apiKey: process.env.AUDIT_API_KEY,
    timeoutMs: toNumber(process.env.AUDIT_TIMEOUT_MS, 2000),
  },
};

assertSecret('JWT_SECRET', config.jwt.secret);
assertSecret('DEFAULT_USER_PASSWORD', config.demoUser.password);
assertSecret('DB_PASSWORD', config.db.password);
assertSecret('AUDIT_API_KEY', config.audit.apiKey);

module.exports = { config };
