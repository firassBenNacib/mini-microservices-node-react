const path = require('node:path');
const { runner } = require('node-pg-migrate');

function buildDatabaseUrl(dbConfig) {
  return `postgres://${encodeURIComponent(dbConfig.user)}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`;
}

async function runMigrations(dbConfig) {
  await runner({
    databaseUrl: buildDatabaseUrl(dbConfig),
    dir: path.join(__dirname, '..', 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    count: Infinity,
    verbose: false,
  });
}

module.exports = { runMigrations };
