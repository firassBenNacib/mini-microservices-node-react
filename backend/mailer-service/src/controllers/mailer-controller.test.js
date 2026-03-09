const assert = require('node:assert/strict');
const test = require('node:test');

process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://127.0.0.1:8080';
process.env.MAILER_API_KEY = process.env.MAILER_API_KEY || 'test-mailer-key';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'smtp.example.net';
process.env.SMTP_USER = process.env.SMTP_USER || 'smtp-user';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'smtp-pass';
process.env.SMTP_FROM = process.env.SMTP_FROM || 'noreply@example.net';

const controllerPath = require.resolve('./mailer-controller');

function loadController() {
  delete require.cache[controllerPath];
  return require('./mailer-controller').createMailerController;
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

test('send rejects invalid mailer keys', async () => {
  const createMailerController = loadController();
  const controller = createMailerController({
    mailerService: {
      isConfigured: () => true,
      send: async () => {},
    },
  });
  const response = createResponse();

  await controller.send(
    {
      headers: { 'x-mailer-key': 'wrong-key' },
      body: { to: 'user@example.com', subject: 'hello', text: 'world' },
    },
    response
  );

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { error: 'invalid mailer key' });
});

test('send rejects requests when SMTP is not configured', async () => {
  const createMailerController = loadController();
  const controller = createMailerController({
    mailerService: {
      isConfigured: () => false,
      send: async () => {},
    },
  });
  const response = createResponse();

  await controller.send(
    {
      headers: { 'x-mailer-key': 'test-mailer-key' },
      body: { to: 'user@example.com', subject: 'hello', text: 'world' },
    },
    response
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { error: 'SMTP is not configured' });
});

test('send delegates to the mailer service for valid requests', async () => {
  const sent = [];
  const createMailerController = loadController();
  const controller = createMailerController({
    mailerService: {
      isConfigured: () => true,
      send: async (payload) => {
        sent.push(payload);
      },
    },
  });
  const response = createResponse();

  await controller.send(
    {
      headers: { 'x-mailer-key': 'test-mailer-key' },
      body: { to: 'user@example.com', subject: 'hello', text: 'world' },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.deepEqual(sent, [{ to: 'user@example.com', subject: 'hello', text: 'world' }]);
});
