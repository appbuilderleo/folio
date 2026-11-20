import { ensureSchema, pool } from './db';

async function main() {
  console.log('A inicializar esquema Fólio (users, user_sessions, curricula, topics, user_unlocks) no CockroachDB...');
  const res = await ensureSchema();
  if (!res.connected) {
    console.error('Erro ao inicializar CockroachDB:', res.error);
    process.exit(1);
  }

  const counts = await pool!.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users_count,
      (SELECT COUNT(*)::int FROM users WHERE role = 'admin') AS admins_count,
      (SELECT COUNT(*)::int FROM curricula) AS curricula_count,
      (SELECT COUNT(*)::int FROM topics) AS topics_count,
      (SELECT COUNT(*)::int FROM user_unlocks) AS unlocks_count
  `);

  console.log('CockroachDB pronto!', counts.rows[0]);
  await pool!.end();
}

main();
