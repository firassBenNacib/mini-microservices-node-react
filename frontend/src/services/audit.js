import { AUDIT_URL } from './config.js';

export const fetchAuditEvents = async (token, limit = 10) => {
  const res = await fetch(`${AUDIT_URL}/recent?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch audit events');
  }
  return res.json();
};
