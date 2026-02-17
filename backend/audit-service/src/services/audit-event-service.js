async function createEvent(pool, event) {
  await pool.query(
    'INSERT INTO audit_events (event_type, actor, details, source) VALUES ($1, $2, $3, $4)',
    [event.eventType, event.actor || null, event.details || null, event.source || null]
  );
}

async function listRecent(pool, limit) {
  const safeLimit = Number.isFinite(limit) ? limit : 20;
  const { rows } = await pool.query(
    `SELECT id,
            event_type AS "eventType",
            actor,
            details,
            source,
            created_at AS "createdAt"
     FROM audit_events
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return rows;
}

module.exports = { createEvent, listRecent };
