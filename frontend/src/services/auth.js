import { AUTH_URL } from './config.js';

const LEGACY_TOKEN_KEY = 'demo_token';
let refreshInFlight = null;

function clearLegacyToken() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Ignore storage access errors in locked-down browsers and tests.
  }
}

function readCookie(name) {
  const cookieString = typeof document === 'undefined' ? '' : document.cookie || '';
  const cookies = cookieString.split(';').map((entry) => entry.trim()).filter(Boolean);

  for (const entry of cookies) {
    const [cookieName, ...parts] = entry.split('=');
    if (cookieName === name) {
      return decodeURIComponent(parts.join('='));
    }
  }

  return '';
}

function buildHeaders(method, headers = {}) {
  const next = new Headers(headers);
  const normalizedMethod = String(method || 'GET').toUpperCase();

  if (!next.has('Accept')) {
    next.set('Accept', 'application/json');
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
    const csrfToken = readCookie('XSRF-TOKEN');
    if (csrfToken) {
      next.set('X-XSRF-TOKEN', csrfToken);
    }
  }

  return next;
}

async function parseSessionResponse(response) {
  if (!response.ok) {
    throw new Error('Authentication request failed');
  }

  return response.json();
}

export async function fetchSession() {
  clearLegacyToken();
  const response = await fetch(`${AUTH_URL}/session`, {
    credentials: 'include',
    headers: buildHeaders('GET'),
  });

  return parseSessionResponse(response);
}

export async function refreshSession() {
  clearLegacyToken();
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${AUTH_URL}/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: buildHeaders('POST'),
    })
      .then(parseSessionResponse)
      .catch(() => ({ authenticated: false, user: null, expiresIn: 0 }))
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

export async function ensureSession() {
  const session = await fetchSession();
  if (session.authenticated) {
    return session;
  }

  return refreshSession();
}

export async function login(email, password) {
  clearLegacyToken();
  const response = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders('POST', {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ email, password }),
  });

  return parseSessionResponse(response);
}

export async function logout() {
  clearLegacyToken();
  const response = await fetch(`${AUTH_URL}/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders('POST'),
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

export async function sessionFetch(url, options = {}) {
  const method = options.method || 'GET';

  const execute = () =>
    fetch(url, {
      ...options,
      method,
      credentials: 'include',
      headers: buildHeaders(method, options.headers),
    });

  let response = await execute();
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed?.authenticated) {
    return response;
  }

  response = await execute();
  return response;
}
