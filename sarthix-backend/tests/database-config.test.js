import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPoolConfig } from '../src/config/database.js';

const config = {
  databaseUrl: '',
  nodeEnv: 'development',
  db: {
    host: 'localhost',
    port: 5432,
    name: 'sarthix',
    user: 'sarthix_app',
    password: '',
    ssl: false,
  },
};

test('local PostgreSQL connections do not force SSL when DB_SSL is false', () => {
  assert.equal(buildPoolConfig(config).ssl, false);
});

test('development TLS verifies certificates only when configured as production', () => {
  assert.deepEqual(buildPoolConfig({
    ...config,
    db: { ...config.db, ssl: true },
  }).ssl, { rejectUnauthorized: false });
  assert.deepEqual(buildPoolConfig({
    ...config,
    nodeEnv: 'production',
    db: { ...config.db, ssl: true },
  }).ssl, { rejectUnauthorized: true });
});

test('DATABASE_URL connections use TLS and validate certificates in production', () => {
  const result = buildPoolConfig({
    ...config,
    databaseUrl: 'postgresql://db.example.invalid/postgres',
  });
  assert.equal(result.connectionString, 'postgresql://db.example.invalid/postgres');
  assert.deepEqual(result.ssl, { rejectUnauthorized: false });
  assert.deepEqual(buildPoolConfig({
    ...config,
    nodeEnv: 'production',
    databaseUrl: 'postgresql://db.example.invalid/postgres',
  }).ssl, { rejectUnauthorized: true });
});
