const bcrypt = require('bcryptjs');

async function seedDefaultUser(pool, demoUser) {
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [demoUser.email]);
  if (rows.length > 0) return;

  const hash = bcrypt.hashSync(demoUser.password, 10);
  await pool.query(
    'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
    [demoUser.email, hash, 'user']
  );
}

async function findUserByEmail(pool, email) {
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  if (!rows.length) return null;
  return rows[0];
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

module.exports = { seedDefaultUser, findUserByEmail, verifyPassword };
