const { config } = require('../config');

async function postMailer(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.mailer.timeoutMs);

  try {
    return await fetch(config.mailer.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mailer-key': config.mailer.apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { postMailer };

