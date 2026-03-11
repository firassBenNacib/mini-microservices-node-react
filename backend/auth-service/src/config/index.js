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

function toBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
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
  const usesExampleDomain = (() => {
    if (
      normalized === 'example.com' ||
      normalized.endsWith('.example.com') ||
      normalized.endsWith('@example.com')
    ) {
      return true;
    }

    try {
      const parsed = new URL(normalized);
      const host = (parsed.hostname || '').toLowerCase();
      return host === 'example.com' || host.endsWith('.example.com');
    } catch {
      return false;
    }
  })();

  return (
    PLACEHOLDER_VALUES.has(normalized) ||
    normalized.includes('placeholder') ||
    normalized.startsWith('your-') ||
    usesExampleDomain ||
    normalized.includes('replace-with')
  );
}

function assertSecret(name, value) {
  assertRequired(name, value);
  if (isPlaceholder(value)) {
    throw new Error(`${name} uses a placeholder value and must be replaced`);
  }
}

function isLocalServiceHost(host) {
  return ['127.0.0.1', 'localhost', 'audit-service'].includes(String(host || '').toLowerCase());
}

function normalizeServiceUrl(name, value) {
  assertRequired(name, value);

  let parsed;
  try {
    parsed = new URL(String(value).trim());
  } catch (error) {
    throw new Error(`${name} must be a valid absolute URL`, { cause: error });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https`);
  }

  if (parsed.protocol !== 'https:' && !isLocalServiceHost(parsed.hostname)) {
    throw new Error(`${name} must use https outside local service networks`);
  }

  return parsed.toString();
}

const config = {
  port: toNumber(process.env.PORT, 8081),
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  jwt: {
    currentKid: process.env.JWT_CURRENT_KID || 'active-key',
    currentSecret: process.env.JWT_SECRET_CURRENT || process.env.JWT_SECRET,
    previousSecret: process.env.JWT_SECRET_PREVIOUS || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
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
    url: normalizeServiceUrl('AUDIT_URL', process.env.AUDIT_URL || 'http://audit-service:8084/audit/events'), // NOSONAR: internal Docker network traffic stays on the private service bridge.
    apiKey: process.env.AUDIT_API_KEY,
    timeoutMs: toNumber(process.env.AUDIT_TIMEOUT_MS, 2000),
  },
  cookie: {
    secure: toBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
    sameSite: process.env.COOKIE_SAMESITE || 'Lax',
  },
};

assertSecret('JWT_SECRET_CURRENT', config.jwt.currentSecret);
if (config.jwt.previousSecret) {
  assertSecret('JWT_SECRET_PREVIOUS', config.jwt.previousSecret);
}
assertSecret('DEFAULT_USER_PASSWORD', config.demoUser.password);
assertSecret('DB_PASSWORD', config.db.password);
assertSecret('AUDIT_API_KEY', config.audit.apiKey);

module.exports = { config };
