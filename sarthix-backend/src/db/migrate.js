import { query, getPool, shutdown } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const LOCK_KEY = 123456789;

function discoverMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[migrate] No migrations directory found');
    return [];
  }
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files;
}

async function runMigrations() {
  console.log('[migrate] Starting migration process...');
  const pool = getPool();
  const client = await pool.connect();
  console.log('[migrate] Database client connected');
  
  try {
    console.log('[migrate] Acquiring advisory lock...');
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    console.log('[migrate] Advisory lock acquired');
    
    console.log('[migrate] Ensuring schema_migrations table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[migrate] schema_migrations table ready');
    
    const executedResult = await client.query('SELECT migration_name FROM public.schema_migrations');
    const executed = new Set(executedResult.rows.map(r => r.migration_name));
    console.log(`[migrate] Found ${executed.size} previously executed migration(s)`);
    
    const migrationFiles = discoverMigrations();
    console.log(`[migrate] Discovered ${migrationFiles.length} migration file(s)`);
    
    let applied = 0;
    for (const file of migrationFiles) {
      if (executed.has(file)) {
        console.log(`[migrate] Skipping ${file} (already applied)`);
        continue;
      }
      
      console.log(`[migrate] Applying ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO public.schema_migrations (migration_name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[migrate] Successfully applied ${file}`);
        applied++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] Failed to apply ${file}: ${err.message}`);
        throw err;
      }
    }
    
    console.log(`[migrate] Complete. Applied ${applied} migration(s).`);
  } finally {
    try {
      console.log('[migrate] Releasing advisory lock...');
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    } catch (e) {
      // Ignore unlock errors
    }
    client.release();
    console.log('[migrate] Client released');
    await shutdown();
    console.log('[migrate] Pool shut down');
  }
}

// Run if called directly
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMain) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('[migrate] Migration failed:', err.message);
      process.exit(1);
    });
}

export { runMigrations, discoverMigrations };
