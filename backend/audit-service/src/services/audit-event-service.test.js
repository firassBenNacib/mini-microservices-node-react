const assert = require('node:assert/strict');
const test = require('node:test');

const { createEvent, listRecent } = require('./audit-event-service');

test('createEvent persists nullable columns safely', async () => {
  let queryArgs = null;
  const pool = {
    async query(sql, values) {
      queryArgs = { sql, values };
      return { rows: [] };
    },
  };

  await createEvent(pool, {
    eventType: 'LOGIN_SUCCESS',
    actor: '',
    details: '',
    source: '',
  });

  assert.match(queryArgs.sql, /INSERT INTO audit_events/);
  assert.deepEqual(queryArgs.values, ['LOGIN_SUCCESS', null, null, null]);
});

test('listRecent falls back to the default limit when a non-finite value is provided', async () => {
  const expectedRows = [{ id: 1, eventType: 'LOGIN_SUCCESS' }];
  let queryArgs = null;
  const pool = {
    async query(sql, values) {
      queryArgs = { sql, values };
      return { rows: expectedRows };
    },
  };

  const rows = await listRecent(pool, Number.NaN);

  assert.match(queryArgs.sql, /LIMIT \$1/);
  assert.deepEqual(queryArgs.values, [20]);
  assert.deepEqual(rows, expectedRows);
});
