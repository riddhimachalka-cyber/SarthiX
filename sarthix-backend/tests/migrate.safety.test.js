import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { discoverMigrations } from '../src/db/migrate.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Migration runner - safety tests', () => {
  it('discovers migrations in deterministic order', () => {
    const migrations = discoverMigrations();
    assert(Array.isArray(migrations));
    for (let i = 1; i < migrations.length; i++) {
      const cmp = migrations[i].localeCompare(migrations[i-1], undefined, { numeric: true });
      assert(cmp >= 0, `Order broken: ${migrations[i-1]} > ${migrations[i]}`);
    }
  });
  
  it('only includes .sql files', () => {
    const migrations = discoverMigrations();
    for (const m of migrations) {
      assert(m.endsWith('.sql'));
    }
  });
  
  it('migration files exist', () => {
    const migrationsDir = path.join(__dirname, '..', 'src', 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    assert(files.length >= 3);
  });
  
  it('migration 001 and 002 exist in order', () => {
    const migrations = discoverMigrations();
    assert(migrations.includes('001_enable_vector.sql'));
    assert(migrations.includes('002_create_tables.sql'));
    const idx1 = migrations.indexOf('001_enable_vector.sql');
    const idx2 = migrations.indexOf('002_create_tables.sql');
    assert(idx1 < idx2);
  });
  
  it('002 uses extensions.vector(768)', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'migrations', '002_create_tables.sql'), 'utf8');
    assert(content.includes('extensions.vector(768)'));
    assert(!content.includes('embedding vector(768)'));
  });
  
  it('003 creates HNSW cosine index on extensions.vector', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'migrations', '003_create_vector_index.sql'), 'utf8');
    assert(content.includes('CREATE INDEX IF NOT EXISTS'));
    assert(content.includes('USING hnsw'));
    assert(content.includes('vector_cosine_ops'));
    assert(content.includes('scheme_chunks'));
  });
});
