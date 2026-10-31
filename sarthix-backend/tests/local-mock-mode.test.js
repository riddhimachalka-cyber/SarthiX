import assert from 'node:assert/strict';
import test from 'node:test';
import { createDatabaseAccess } from '../src/config/database.js';
import { resolveLocalMockMode } from '../src/config/env.js';
import { createLocalMockResponses } from '../src/services/local-mock.service.js';

test('mock mode flag is opt-in and rejected in production', () => {
  assert.equal(resolveLocalMockMode('development', undefined), false);
  assert.equal(resolveLocalMockMode('development', 'false'), false);
  assert.equal(resolveLocalMockMode('development', 'true'), true);
  assert.throws(() => resolveLocalMockMode('production', 'true'), /not allowed/);
  assert.throws(() => resolveLocalMockMode('development', 'yes'), /must be true or false/);
});

test('mock database access never invokes the PostgreSQL pool provider', async () => {
  let poolRequested = false;
  const access = createDatabaseAccess({
    localMockMode: true,
    poolProvider() {
      poolRequested = true;
      throw new Error('pool provider must not run');
    },
  });

  await assert.rejects(access.query('SELECT 1'), /disabled in LOCAL_MOCK_MODE/);
  assert.deepEqual(await access.healthCheck(), {
    ok: false,
    mock: true,
    error: 'Database access is disabled in LOCAL_MOCK_MODE',
  });
  await access.shutdown();
  assert.equal(poolRequested, false);
});

test('normal database access still queries the configured pool provider', async () => {
  const calls = [];
  const fakePool = {
    async query(sql) {
      calls.push(sql);
      return { rows: [{ ok: 1 }] };
    },
    async end() {
      calls.push('end');
    },
  };
  const access = createDatabaseAccess({ poolProvider: () => fakePool });

  assert.deepEqual(await access.query('SELECT 1'), { rows: [{ ok: 1 }] });
  assert.deepEqual(await access.healthCheck(), { ok: true, result: { ok: 1 } });
  await access.shutdown();
  assert.deepEqual(calls, ['SELECT 1', 'SELECT 1 as ok', 'end']);
});

test('local mock API responses are labeled and contain no fabricated scheme facts', () => {
  const mock = createLocalMockResponses();
  const health = mock.databaseHealth();
  const search = mock.schemeSearch({ question: 'Find support' });
  const chat = mock.chat({ message: 'What benefits can I receive?' });
  const detail = mock.schemeDetails();

  assert.equal(health.mode, 'mock');
  assert.equal(health.status, 'mock');
  assert.equal(search.mode, 'mock');
  assert.deepEqual(search.chunks, []);
  assert.equal(search.demoData, false);
  assert.equal(detail.mode, 'mock');
  assert.equal(chat.mode, 'mock');
  assert.equal(chat.insufficientInformation, true);
  assert.equal(chat.eligibility, null);
  assert.equal(chat.benefits, null);
  assert.deepEqual(chat.sources, []);
  assert.match(chat.answer, /LOCAL MOCK MODE/);
});

test('mock search and chat preserve request validation', () => {
  const mock = createLocalMockResponses();
  assert.throws(() => mock.schemeSearch({ question: '' }), /question must be/);
  assert.throws(() => mock.chat({ message: '' }), /message must be/);
});
