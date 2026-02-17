const { config } = require('../config');

function createMailerController({ mailerService }) {
  function health(req, res) {
    res.json({ status: 'ok' });
  }

  async function send(req, res) {
    const apiKey = req.headers['x-mailer-key'];
    if (!apiKey || apiKey !== config.mailerApiKey) {
      return res.status(401).json({ error: 'invalid mailer key' });
    }

    const { to, subject, text } = req.body || {};
    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'to, subject, and text are required' });
    }

    if (!mailerService.isConfigured()) {
      return res.status(500).json({ error: 'SMTP is not configured' });
    }

    try {
      await mailerService.send({ to, subject, text });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(502).json({ error: 'failed to send email' });
    }
  }

  return { health, send };
}

module.exports = { createMailerController };

