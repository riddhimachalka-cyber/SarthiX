import { describe, it } from 'node:test';
import assert from 'node:assert';
import { discoverMigrations } from '../src/db/migrate.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Migration runner', () => {
  it('discovers migrations in deterministic order', () => {
    const migrations = discoverMigrations();
    assert(Array.isArray(migrations));
    // Check ordering
    for (let i = 1; i < migrations.length; i++) {
      assert(migrations[i] >= migrations[i-1] || migrations[i].localeCompare(migrations[i-1], undefined, { numeric: true }) >= 0);
    }
  });
  
  it('only includes .sql files', () => {
    const migrations = discoverMigrations();
    for (const m of migrations) {
      assert(m.endsWith('.sql'));
    }
  });
  
  it('migration files exist and are readable', () => {
    const migrationsDir = path.join(__dirname, '..', 'src', 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    assert(files.length >= 2); // Should have at least 001 and 002
  });
});
