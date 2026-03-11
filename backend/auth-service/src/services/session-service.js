const crypto = require('node:crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function revokeRefreshTokensForUser(client, userEmail) {
  await client.query(
    `UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_email = $1
        AND revoked_at IS NULL`,
    [userEmail],
  );
}

async function storeRefreshToken(client, { userEmail, refreshToken, expiresAt }) {
  await client.query(
    `INSERT INTO refresh_tokens (user_email, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userEmail, hashToken(refreshToken), expiresAt],
  );
}

async function createRefreshSession(pool, { userEmail, refreshToken, expiresAt }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await revokeRefreshTokensForUser(client, userEmail);
    await storeRefreshToken(client, { userEmail, refreshToken, expiresAt });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function rotateRefreshSession(pool, { userEmail, currentRefreshToken, nextRefreshToken, expiresAt }) {
  const client = await pool.connect();
  const currentHash = hashToken(currentRefreshToken);

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id
         FROM refresh_tokens
        WHERE token_hash = $1
          AND user_email = $2
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1`,
      [currentHash, userEmail],
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(
      `UPDATE refresh_tokens
          SET revoked_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [rows[0].id],
    );
    await storeRefreshToken(client, {
      userEmail,
      refreshToken: nextRefreshToken,
      expiresAt,
    });
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function revokeRefreshSession(pool, refreshToken) {
  if (!refreshToken) {
    return;
  }

  await pool.query(
    `UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1
        AND revoked_at IS NULL`,
    [hashToken(refreshToken)],
  );
}

module.exports = {
  createRefreshSession,
  revokeRefreshSession,
  rotateRefreshSession,
};
