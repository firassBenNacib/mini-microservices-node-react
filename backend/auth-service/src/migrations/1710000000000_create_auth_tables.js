exports.up = (pgm) => {
  pgm.createTable(
    'users',
    {
      id: 'id',
      email: { type: 'varchar(255)', notNull: true, unique: true },
      password_hash: { type: 'varchar(255)', notNull: true },
      role: { type: 'varchar(50)', notNull: true },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createTable(
    'refresh_tokens',
    {
      id: 'id',
      user_email: { type: 'varchar(255)', notNull: true },
      token_hash: { type: 'varchar(64)', notNull: true, unique: true },
      expires_at: { type: 'timestamptz', notNull: true },
      revoked_at: { type: 'timestamptz' },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('refresh_tokens', 'user_email', {
    ifNotExists: true,
    name: 'refresh_tokens_user_email_idx',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('refresh_tokens', 'user_email', {
    ifExists: true,
    name: 'refresh_tokens_user_email_idx',
  });
  pgm.dropTable('refresh_tokens', { ifExists: true });
  pgm.dropTable('users', { ifExists: true });
};
