import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

let pool;

function getPool() {
  if (pool) return pool;
  
  let poolConfig;
  if (config.databaseUrl) {
    // Supabase Session Pooler with SSL required
    poolConfig = {
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  } else {
    poolConfig = {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }
  
  pool = new Pool(poolConfig);
  
  pool.on('error', (err) => {
    // Log error without exposing credentials
    console.error('Unexpected database pool error');
  });
  
  return pool;
}

async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

async function healthCheck() {
  try {
    const p = getPool();
    const result = await p.query('SELECT 1 as ok');
    return { ok: true, result: result.rows[0] };
  } catch (err) {
    return { ok: false, error: 'Database connection failed' };
  }
}

async function shutdown() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export { getPool, query, healthCheck, shutdown };
