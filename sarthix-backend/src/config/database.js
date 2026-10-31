import pg from 'pg';
import { config } from './env.js';
import { logDatabaseError } from '../utils/database-diagnostics.js';

const { Pool } = pg;

let pool;

function createPool() {
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
    logDatabaseError(err);
  });
  
  return pool;
}

export function createDatabaseAccess({
  localMockMode = false,
  poolProvider = createPool,
} = {}) {
  let activePool = null;

  function getPool() {
    if (localMockMode) {
      const error = new Error('Database access is disabled in LOCAL_MOCK_MODE');
      error.code = 'LOCAL_MOCK_MODE';
      throw error;
    }
    if (!activePool) activePool = poolProvider();
    return activePool;
  }

  async function query(text, params) {
    return getPool().query(text, params);
  }

  async function healthCheck() {
    try {
      const result = await query('SELECT 1 as ok');
      return { ok: true, result: result.rows[0] };
    } catch (error) {
      if (localMockMode) {
        return { ok: false, mock: true, error: 'Database access is disabled in LOCAL_MOCK_MODE' };
      }
      logDatabaseError(error);
      return { ok: false, error: 'Database connection failed' };
    }
  }

  async function shutdown() {
    if (localMockMode) return;
    if (activePool) {
      await activePool.end();
      activePool = null;
      if (pool) pool = null;
    }
  }

  return { getPool, query, healthCheck, shutdown };
}

const databaseAccess = createDatabaseAccess({ localMockMode: config.localMockMode });

export const getPool = databaseAccess.getPool;
export const query = databaseAccess.query;
export const healthCheck = databaseAccess.healthCheck;
export const shutdown = databaseAccess.shutdown;
