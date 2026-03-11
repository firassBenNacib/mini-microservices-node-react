import { AUDIT_URL } from './config.js';
import { sessionFetch } from './auth.js';

export const fetchAuditEvents = async (limit = 10) => {
  const res = await sessionFetch(`${AUDIT_URL}/recent?limit=${limit}`);
  if (!res.ok) {
    throw new Error('Failed to fetch audit events');
  }
  return res.json();
};
