/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable(
    'audit_events',
    {
      id: 'id',
      event_type: {
        type: 'varchar(100)',
        notNull: true,
      },
      actor: {
        type: 'varchar(255)',
      },
      details: {
        type: 'text',
      },
      source: {
        type: 'varchar(100)',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
    },
    { ifNotExists: true },
  );
};

exports.down = (pgm) => {
  pgm.dropTable('audit_events', { ifExists: true });
};
