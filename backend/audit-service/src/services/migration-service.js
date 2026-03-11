const path = require('node:path');
const { runner } = require('node-pg-migrate');

async function runMigrations(dbConfig) {
  await runner({
    databaseUrl: `postgres://${encodeURIComponent(dbConfig.user)}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`,
    dir: path.join(__dirname, '..', 'migrations'),
    direction: 'up',
    migrationsTable: 'audit_service_pgmigrations',
    count: Infinity,
    verbose: false,
  });
}

module.exports = { runMigrations };
