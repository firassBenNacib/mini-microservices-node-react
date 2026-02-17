const { config } = require('../config');

async function sendAuditEvent(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.audit.timeoutMs);

  try {
    await fetch(config.audit.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-audit-key': config.audit.apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { sendAuditEvent };
