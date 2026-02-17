const { postMailer } = require('../services/mailer-service');
const { postNotification } = require('../services/notification-service');
const { sendAuditEvent } = require('../services/audit-service');
const { isE164Phone } = require('../utils/e164');

function health(req, res) {
  res.json({ status: 'ok' });
}

function message(req, res) {
  res.json({ message: 'Microservices deployed and working' });
  sendAuditEvent({
    eventType: 'MESSAGE_VIEW',
    actor: req.user?.sub || 'unknown',
    details: 'message viewed',
    source: 'api-service',
  }).catch(() => {});
}

async function sendTestEmail(req, res) {
  const { to, subject, text } = req.body || {};
  if (!to) {
    return res.status(400).json({ error: 'to is required' });
  }

  try {
    const response = await postMailer({
      to,
      subject: subject || 'DevOps Test Email',
      text: text || 'This is a test email from the demo API service.',
    });

    if (!response.ok) {
      sendAuditEvent({
        eventType: 'EMAIL_FAILED',
        actor: req.user?.sub || 'unknown',
        details: `mailer error for ${to}`,
        source: 'api-service',
      }).catch(() => {});
      return res.status(502).json({ error: 'mailer service error' });
    }

    res.json({ ok: true });
    sendAuditEvent({
      eventType: 'EMAIL_SENT',
      actor: req.user?.sub || 'unknown',
      details: `sent to ${to}`,
      source: 'api-service',
    }).catch(() => {});
  } catch (err) {
    sendAuditEvent({
      eventType: 'EMAIL_FAILED',
      actor: req.user?.sub || 'unknown',
      details: `mailer unavailable for ${to}`,
      source: 'api-service',
    }).catch(() => {});
    res.status(502).json({ error: 'mailer service unavailable' });
  }
}

async function sendTestNotification(req, res) {
  const { to, subject, text } = req.body || {};
  if (!to) {
    return res.status(400).json({ error: 'to is required' });
  }
  const normalizedTo = String(to).trim();
  if (!isE164Phone(normalizedTo)) {
    return res.status(400).json({ error: 'to must be a valid E.164 phone number, for example +12025550123' });
  }

  try {
    const response = await postNotification({
      to: normalizedTo,
      subject: subject || 'DevOps Test Notification',
      text: text || 'This is a test notification from the demo API service.',
    });

    if (!response.ok) {
      sendAuditEvent({
        eventType: 'NOTIFY_FAILED',
        actor: req.user?.sub || 'unknown',
        details: `notification error for ${normalizedTo}`,
        source: 'api-service',
      }).catch(() => {});
      return res.status(502).json({ error: 'notification service error' });
    }

    res.json({ ok: true });
    sendAuditEvent({
      eventType: 'NOTIFY_SENT',
      actor: req.user?.sub || 'unknown',
      details: `sent to ${normalizedTo}`,
      source: 'api-service',
    }).catch(() => {});
  } catch (err) {
    sendAuditEvent({
      eventType: 'NOTIFY_FAILED',
      actor: req.user?.sub || 'unknown',
      details: `notification unavailable for ${normalizedTo}`,
      source: 'api-service',
    }).catch(() => {});
    res.status(502).json({ error: 'notification service unavailable' });
  }
}

module.exports = { health, message, sendTestEmail, sendTestNotification };
