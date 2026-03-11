const assert = require('node:assert/strict');
const test = require('node:test');

process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://127.0.0.1:8080';
process.env.JWT_SECRET_CURRENT = process.env.JWT_SECRET_CURRENT || 'test-jwt-secret-value';
process.env.MAILER_API_KEY = process.env.MAILER_API_KEY || 'test-mailer-key';
process.env.NOTIFY_API_KEY = process.env.NOTIFY_API_KEY || 'test-notify-key';
process.env.AUDIT_API_KEY = process.env.AUDIT_API_KEY || 'test-audit-key';

const mailerService = require('../services/mailer-service');
const notificationService = require('../services/notification-service');
const auditService = require('../services/audit-service');

const controllerPath = require.resolve('./api-controller');
const originalPostMailer = mailerService.postMailer;
const originalPostNotification = notificationService.postNotification;
const originalSendAuditEvent = auditService.sendAuditEvent;

function restoreStubs() {
  mailerService.postMailer = originalPostMailer;
  notificationService.postNotification = originalPostNotification;
  auditService.sendAuditEvent = originalSendAuditEvent;
  delete require.cache[controllerPath];
}

function loadController() {
  delete require.cache[controllerPath];
  return require('./api-controller');
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('message returns the demo payload and audits the view', async (t) => {
  t.after(restoreStubs);

  const auditEvents = [];
  auditService.sendAuditEvent = async (payload) => {
    auditEvents.push(payload);
  };

  const { message } = loadController();
  const response = createResponse();

  await message({ user: { sub: 'user@example.com' } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { message: 'Microservices deployed and working' });
  assert.deepEqual(auditEvents, [
    {
      eventType: 'MESSAGE_VIEW',
      actor: 'user@example.com',
      details: 'message viewed',
      source: 'api-service',
    },
  ]);
});

test('sendTestEmail returns 502 and audits when the mailer rejects the request', async (t) => {
  t.after(restoreStubs);

  const auditEvents = [];
  mailerService.postMailer = async () => ({ ok: false });
  auditService.sendAuditEvent = async (payload) => {
    auditEvents.push(payload);
  };

  const { sendTestEmail } = loadController();
  const response = createResponse();

  await sendTestEmail(
    {
      user: { sub: 'user@example.com' },
      body: { to: 'user@example.com', subject: 'hello', text: 'world' },
    },
    response
  );

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, { error: 'mailer service error' });
  assert.deepEqual(auditEvents, [
    {
      eventType: 'EMAIL_FAILED',
      actor: 'user@example.com',
      details: 'mailer error for user@example.com',
      source: 'api-service',
    },
  ]);
});

test('sendTestNotification rejects invalid phone numbers before calling downstream services', async (t) => {
  t.after(restoreStubs);

  const { sendTestNotification } = loadController();
  const response = createResponse();

  await sendTestNotification(
    {
      user: { sub: 'user@example.com' },
      body: { to: '12345', subject: 'hello', text: 'world' },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: 'to must be a valid E.164 phone number, for example +12025550123',
  });
});
