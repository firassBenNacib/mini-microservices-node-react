const { config } = require('../config');
const auditEventService = require('../services/audit-event-service');
const { clampNumber } = require('../utils/clamp-number');

function createAuditController({ pool }) {
  function health(req, res) {
    res.json({ status: 'ok' });
  }

  async function createEvent(req, res) {
    const apiKey = req.headers['x-audit-key'];
    if (!apiKey || apiKey !== config.auditApiKey) {
      return res.status(401).json({ error: 'invalid audit key' });
    }

    const { eventType, actor, details, source } = req.body || {};
    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    try {
      await auditEventService.createEvent(pool, { eventType, actor, details, source });
      return res.json({ status: 'ok' });
    } catch (err) {
      return res.status(500).json({ error: 'failed to write audit event' });
    }
  }

  async function recent(req, res) {
    const limit = clampNumber(Number(req.query.limit || 20), 1, 100);
    try {
      const rows = await auditEventService.listRecent(pool, limit);
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ error: 'failed to load audit events' });
    }
  }

  return { health, createEvent, recent };
}

module.exports = { createAuditController };
