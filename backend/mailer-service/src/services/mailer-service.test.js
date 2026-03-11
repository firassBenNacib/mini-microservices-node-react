const assert = require('node:assert/strict');
const test = require('node:test');
const nodemailer = require('nodemailer');

function loadService() {
  delete require.cache[require.resolve('./mailer-service')];
  return require('./mailer-service');
}

test('createMailerService reports an unconfigured transporter when smtp.host is missing', async (t) => {
  const originalCreateTransport = nodemailer.createTransport;

  t.after(() => {
    nodemailer.createTransport = originalCreateTransport;
    delete require.cache[require.resolve('./mailer-service')];
  });

  nodemailer.createTransport = () => {
    throw new Error('should not create a transporter');
  };

  const { createMailerService } = loadService();
  const service = createMailerService({
    smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: 'noreply@example.com' },
  });

  assert.equal(service.isConfigured(), false);
  await assert.rejects(
    () => service.send({ to: 'user@example.com', subject: 'Hi', text: 'Body' }),
    /SMTP is not configured/,
  );
});

test('createMailerService sends mail through nodemailer when smtp.host is configured', async (t) => {
  const originalCreateTransport = nodemailer.createTransport;
  let transportOptions = null;
  let sentMessage = null;

  t.after(() => {
    nodemailer.createTransport = originalCreateTransport;
    delete require.cache[require.resolve('./mailer-service')];
  });

  nodemailer.createTransport = (options) => {
    transportOptions = options;
    return {
      async sendMail(message) {
        sentMessage = message;
      },
    };
  };

  const { createMailerService } = loadService();
  const service = createMailerService({
    smtp: {
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      user: 'mailer-user',
      pass: 'mailer-pass',
      from: 'noreply@example.com',
    },
  });

  await service.send({ to: 'user@example.com', subject: 'Hi', text: 'Body' });

  assert.equal(service.isConfigured(), true);
  assert.deepEqual(transportOptions, {
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: { user: 'mailer-user', pass: 'mailer-pass' },
  });
  assert.deepEqual(sentMessage, {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Hi',
    text: 'Body',
  });
});
