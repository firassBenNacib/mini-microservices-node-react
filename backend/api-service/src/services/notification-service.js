const { config } = require('../config');

async function postNotification(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.notify.timeoutMs);

  try {
    return await fetch(config.notify.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-notify-key': config.notify.apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { postNotification };
