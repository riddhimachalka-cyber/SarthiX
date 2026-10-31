import pg from 'pg';
import { logDatabaseError } from '../src/utils/database-diagnostics.js';
import { isExpectedIntegrationUrl } from '../src/utils/database-url.js';

function parseProjectRef(args) {
  const index = args.indexOf('--project-ref');
  const value = index >= 0 ? args[index + 1] : '';
  return /^[a-z0-9]{10,40}$/.test(value) ? value : null;
}

const databaseUrl = process.env.DATABASE_URL;
const projectRef = parseProjectRef(process.argv.slice(2));

if (!databaseUrl || !projectRef || !isExpectedIntegrationUrl(databaseUrl, projectRef)) {
  console.error('Database diagnostic configuration rejected; verify the Integration-Test Session Pooler URI and project reference.');
  process.exitCode = 1;
} else {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 1000,
  });

  try {
    await pool.query('SELECT 1 AS ok');
    console.log('Database connectivity check passed (SELECT 1).');
  } catch (error) {
    logDatabaseError(error);
    console.error('Database connectivity check failed; details are in the sanitized diagnostic log.');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
