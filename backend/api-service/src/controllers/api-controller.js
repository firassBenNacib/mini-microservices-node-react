const { postMailer } = require('../services/mailer-service');
const { postNotification } = require('../services/notification-service');
const { sendAuditEvent } = require('../services/audit-service');
const { sendProblem } = require('../http/problem-response');
const { isE164Phone } = require('../utils/e164');

function recordAuditEvent(req, payload) {
  sendAuditEvent(payload).catch((err) => {
    req.log?.warn({ err, eventType: payload.eventType }, 'failed to write audit event');
  });
}

function health(req, res) {
  res.json({ status: 'ok' });
}

function message(req, res) {
  res.json({ message: 'Microservices deployed and working' });
  recordAuditEvent(req, {
    eventType: 'MESSAGE_VIEW',
    actor: req.user?.sub || 'unknown',
    details: 'message viewed',
    source: 'api-service',
  });
}

async function sendTestEmail(req, res) {
  const { to, subject, text } = req.body || {};
  if (!to) {
    return sendProblem(res, 400, 'to is required');
  }

  try {
    const response = await postMailer({
      to,
      subject: subject || 'DevOps Test Email',
      text: text || 'This is a test email from the demo API service.',
    });

    if (!response.ok) {
      recordAuditEvent(req, {
        eventType: 'EMAIL_FAILED',
        actor: req.user?.sub || 'unknown',
        details: `mailer error for ${to}`,
        source: 'api-service',
      });
      return sendProblem(res, 502, 'mailer service error');
    }

    res.json({ ok: true });
    recordAuditEvent(req, {
      eventType: 'EMAIL_SENT',
      actor: req.user?.sub || 'unknown',
      details: `sent to ${to}`,
      source: 'api-service',
    });
  } catch (err) {
    req.log?.warn({ err, to }, 'mailer service unavailable');
    recordAuditEvent(req, {
      eventType: 'EMAIL_FAILED',
      actor: req.user?.sub || 'unknown',
      details: `mailer unavailable for ${to}`,
      source: 'api-service',
    });
    return sendProblem(res, 502, 'mailer service unavailable');
  }
}

async function sendTestNotification(req, res) {
  const { to, subject, text } = req.body || {};
  if (!to) {
    return sendProblem(res, 400, 'to is required');
  }
  const normalizedTo = String(to).trim();
  if (!isE164Phone(normalizedTo)) {
    return sendProblem(res, 400, 'to must be a valid E.164 phone number, for example +12025550123');
  }

  try {
    const response = await postNotification({
      to: normalizedTo,
      subject: subject || 'DevOps Test Notification',
      text: text || 'This is a test notification from the demo API service.',
    });

    if (!response.ok) {
      recordAuditEvent(req, {
        eventType: 'NOTIFY_FAILED',
        actor: req.user?.sub || 'unknown',
        details: `notification error for ${normalizedTo}`,
        source: 'api-service',
      });
      return sendProblem(res, 502, 'notification service error');
    }

    res.json({ ok: true });
    recordAuditEvent(req, {
      eventType: 'NOTIFY_SENT',
      actor: req.user?.sub || 'unknown',
      details: `sent to ${normalizedTo}`,
      source: 'api-service',
    });
  } catch (err) {
    req.log?.warn({ err, to: normalizedTo }, 'notification service unavailable');
    recordAuditEvent(req, {
      eventType: 'NOTIFY_FAILED',
      actor: req.user?.sub || 'unknown',
      details: `notification unavailable for ${normalizedTo}`,
      source: 'api-service',
    });
    return sendProblem(res, 502, 'notification service unavailable');
  }
}

module.exports = { health, message, sendTestEmail, sendTestNotification };
