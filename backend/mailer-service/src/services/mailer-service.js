const nodemailer = require('nodemailer');

function createMailerService({ smtp }) {
  let transporter = null;
  if (smtp.host) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
    });
  }

  async function send({ to, subject, text }) {
    if (!transporter) {
      const err = new Error('SMTP is not configured');
      err.code = 'SMTP_NOT_CONFIGURED';
      throw err;
    }

    await transporter.sendMail({
      from: smtp.from,
      to,
      subject,
      text,
    });
  }

  return {
    isConfigured: () => Boolean(transporter),
    send,
  };
}

module.exports = { createMailerService };

