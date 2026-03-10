const { config } = require('../config');
const { handleUnexpectedError, sendProblem } = require('../http/problem-response');

function createMailerController({ mailerService }) {
  function health(req, res) {
    res.json({ status: 'ok' });
  }

  async function send(req, res) {
    const apiKey = req.headers['x-mailer-key'];
    if (!apiKey || apiKey !== config.mailerApiKey) {
      return sendProblem(res, 401, 'invalid mailer key');
    }

    const { to, subject, text } = req.body || {};
    if (!to || !subject || !text) {
      return sendProblem(res, 400, 'to, subject, and text are required');
    }

    if (!mailerService.isConfigured()) {
      return sendProblem(res, 500, 'SMTP is not configured');
    }

    try {
      await mailerService.send({ to, subject, text });
      return res.json({ ok: true });
    } catch (err) {
      return handleUnexpectedError(req, res, err, 'failed to send email');
    }
  }

  return { health, send };
}

module.exports = { createMailerController };
