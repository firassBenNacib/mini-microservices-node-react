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

module.exports = { createPool };
