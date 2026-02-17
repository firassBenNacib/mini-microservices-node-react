const { Pool } = require('pg');

async function createPool(dbConfig) {
  const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.name,
    max: 10,
  });
  await pool.query('SELECT 1');
  return pool;
}

async function initSchema(pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS audit_events (
      id SERIAL PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      actor VARCHAR(255),
      details TEXT,
      source VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`
  );
}

module.exports = { createPool, initSchema };
