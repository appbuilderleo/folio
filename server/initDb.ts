import { ensureSchema, pool } from './db';

async function main() {
  console.log('A inicializar esquema Fólio no CockroachDB...');
  const res = await ensureSchema();
  if (!res.connected) {
    console.error('Erro ao conectar/inicializar CockroachDB:', res.error);
    process.exit(1);
  }
  const ping = await pool!.query('SELECT version() AS ver, current_database() AS db');
  console.log('Ligação CockroachDB confirmada!');
  console.log('Base de dados:', ping.rows[0]?.db);
  console.log('Versão:', ping.rows[0]?.ver);
  await pool!.end();
}

main();
