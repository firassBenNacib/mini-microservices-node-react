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

function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
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

test('message logs a warning when the audit write fails', async (t) => {
  t.after(restoreStubs);

  let warning = null;
  auditService.sendAuditEvent = async () => {
    throw new Error('audit unavailable');
  };

  const { message } = loadController();
  const response = createResponse();

  await message(
    {
      user: { sub: 'user@example.com' },
      log: {
        warn(payload, detail) {
          warning = { payload, detail };
        },
      },
    },
    response,
  );
  await flushMicrotasks();

  assert.equal(response.statusCode, 200);
  assert.equal(warning.detail, 'failed to write audit event');
  assert.equal(warning.payload.eventType, 'MESSAGE_VIEW');
  assert.equal(warning.payload.err.message, 'audit unavailable');
});

test('sendTestEmail returns ok and audits when the mailer accepts the request', async (t) => {
  t.after(restoreStubs);

  const auditEvents = [];
  mailerService.postMailer = async () => ({ ok: true });
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
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.deepEqual(auditEvents, [
    {
      eventType: 'EMAIL_SENT',
      actor: 'user@example.com',
      details: 'sent to user@example.com',
      source: 'api-service',
    },
  ]);
});

test('sendTestEmail returns 502 and warns when the mailer throws', async (t) => {
  t.after(restoreStubs);

  const auditEvents = [];
  let warning = null;
  mailerService.postMailer = async () => {
    throw new Error('mailer unavailable');
  };
  auditService.sendAuditEvent = async (payload) => {
    auditEvents.push(payload);
  };

  const { sendTestEmail } = loadController();
  const response = createResponse();

  await sendTestEmail(
    {
      user: { sub: 'user@example.com' },
      body: { to: 'user@example.com', subject: 'hello', text: 'world' },
      log: {
        warn(payload, detail) {
          warning = { payload, detail };
        },
      },
    },
    response,
  );

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, { error: 'mailer service unavailable' });
  assert.equal(warning.detail, 'mailer service unavailable');
  assert.equal(warning.payload.to, 'user@example.com');
  assert.equal(warning.payload.err.message, 'mailer unavailable');
  assert.deepEqual(auditEvents, [
    {
      eventType: 'EMAIL_FAILED',
      actor: 'user@example.com',
      details: 'mailer unavailable for user@example.com',
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

test('sendTestNotification returns ok and audits when the notification is accepted', async (t) => {
  t.after(restoreStubs);

  const auditEvents = [];
  notificationService.postNotification = async () => ({ ok: true });
  auditService.sendAuditEvent = async (payload) => {
    auditEvents.push(payload);
  };

  const { sendTestNotification } = loadController();
  const response = createResponse();

  await sendTestNotification(
    {
      user: { sub: 'user@example.com' },
      body: { to: ' +12025550123 ', subject: 'hello', text: 'world' },
    },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.deepEqual(auditEvents, [
    {
      eventType: 'NOTIFY_SENT',
      actor: 'user@example.com',
      details: 'sent to +12025550123',
      source: 'api-service',
    },
  ]);
});

test('sendTestNotification returns 502 and warns when the notification service throws', async (t) => {
  t.after(restoreStubs);

  const auditEvents = [];
  let warning = null;
  notificationService.postNotification = async () => {
    throw new Error('notification unavailable');
  };
  auditService.sendAuditEvent = async (payload) => {
    auditEvents.push(payload);
  };

  const { sendTestNotification } = loadController();
  const response = createResponse();

  await sendTestNotification(
    {
      user: { sub: 'user@example.com' },
      body: { to: '+12025550123', subject: 'hello', text: 'world' },
      log: {
        warn(payload, detail) {
          warning = { payload, detail };
        },
      },
    },
    response,
  );

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, { error: 'notification service unavailable' });
  assert.equal(warning.detail, 'notification service unavailable');
  assert.equal(warning.payload.to, '+12025550123');
  assert.equal(warning.payload.err.message, 'notification unavailable');
  assert.deepEqual(auditEvents, [
    {
      eventType: 'NOTIFY_FAILED',
      actor: 'user@example.com',
      details: 'notification unavailable for +12025550123',
      source: 'api-service',
    },
  ]);
});
