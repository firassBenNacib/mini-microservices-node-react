const env = import.meta?.env ?? {};

export const AUTH_URL = env.VITE_AUTH_URL || '/auth';
export const API_URL = env.VITE_API_URL || '/api';
export const AUDIT_URL = env.VITE_AUDIT_URL || '/audit';
export const MAILER_URL = env.VITE_MAILER_URL || '/mailer';
export const NOTIFY_URL = env.VITE_NOTIFY_URL || '/notify';
export const GATEWAY_URL = env.VITE_GATEWAY_URL || '/gateway';
