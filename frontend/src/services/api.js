import { API_URL } from './config.js';

export const fetchMessage = async (token) => {
  const res = await fetch(`${API_URL}/message`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch message');
  }

  return res.json();
};

export const sendTestEmail = async (token, payload) => {
  const res = await fetch(`${API_URL}/send-test-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to send email');
  }
};

export const sendTestNotification = async (token, payload) => {
  const res = await fetch(`${API_URL}/send-test-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to send notification');
  }
};

export const probeHealthEndpoint = async (url, timeoutMs = 4000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return {
        state: 'down',
        detail: `HTTP ${res.status}`,
      };
    }

    let detail = 'ok';
    try {
      const body = await res.json();
      if (body && typeof body.status === 'string' && body.status.trim()) {
        detail = body.status;
      }
    } catch (err) {
      detail = 'ok';
    }

    return {
      state: 'up',
      detail,
    };
  } catch (err) {
    return {
      state: 'unknown',
      detail: 'unreachable or timeout',
    };
  } finally {
    clearTimeout(timeout);
  }
};
