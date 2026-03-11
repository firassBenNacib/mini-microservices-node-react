const { config } = require('../config');
const { handleUnexpectedError, sendProblem } = require('../http/problem-response');
const auditEventService = require('../services/audit-event-service');
const { clampNumber } = require('../utils/clamp-number');

function health(req, res) {
  res.json({ status: 'ok' });
}

function createAuditController({ pool }) {
  async function createEvent(req, res) {
    const apiKey = req.headers['x-audit-key'];
    if (!apiKey || apiKey !== config.auditApiKey) {
      return sendProblem(res, 401, 'invalid audit key');
    }

    const { eventType, actor, details, source } = req.body || {};
    if (!eventType) {
      return sendProblem(res, 400, 'eventType is required');
    }

    try {
      await auditEventService.createEvent(pool, { eventType, actor, details, source });
      return res.json({ status: 'ok' });
    } catch (err) {
      return handleUnexpectedError(req, res, err, 'failed to write audit event');
    }
  }

  async function recent(req, res) {
    const limit = clampNumber(Number(req.query.limit || 20), 1, 100);
    try {
      const rows = await auditEventService.listRecent(pool, limit);
      return res.json(rows);
    } catch (err) {
      return handleUnexpectedError(req, res, err, 'failed to load audit events');
    }
  }

  return { health, createEvent, recent };
}

module.exports = { createAuditController };
