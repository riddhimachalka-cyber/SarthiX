import assert from 'node:assert/strict';
import test from 'node:test';
import { databaseErrorDiagnostic, logDatabaseError } from '../src/utils/database-diagnostics.js';
import { createDbHealthController } from '../src/controllers/db-health.controller.js';
import { isExpectedIntegrationUrl } from '../src/utils/database-url.js';

test('database diagnostics use allowlisted codes and sanitized category messages', () => {
  const diagnostic = databaseErrorDiagnostic({
    code: 'ENOTFOUND',
    message: 'secret host, username, password, and connection string',
  });

  assert.deepEqual(diagnostic, {
    code: 'ENOTFOUND',
    category: 'dns',
    message: 'Database host name could not be resolved.',
  });
  assert.doesNotMatch(JSON.stringify(diagnostic), /secret|username|password|connection string/i);

  const unknown = databaseErrorDiagnostic({ code: 'sensitive-host-value', message: 'secret' });
  assert.equal(unknown.code, 'UNKNOWN');
  assert.doesNotMatch(JSON.stringify(unknown), /sensitive|secret/i);
});

test('database logger emits only the sanitized diagnostic object', () => {
  const calls = [];
  logDatabaseError(
    { code: '28P01', message: 'password=secret; host=private' },
    (...args) => calls.push(args),
  );

  assert.deepEqual(calls, [[
    '[database] PostgreSQL operation failed',
    {
      code: '28P01',
      category: 'authentication',
      message: 'Database authentication was rejected.',
    },
  ]]);
});

test('database health response remains generic while logging sanitized failures', async () => {
  let loggedError;
  const controller = createDbHealthController({
    queryFn: async () => {
      const error = new Error('password=secret host=private');
      error.code = 'ECONNREFUSED';
      throw error;
    },
    logError: (error) => { loggedError = databaseErrorDiagnostic(error); },
  });
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await controller({}, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    success: false,
    message: 'Database unavailable',
    status: 'error',
  });
  assert.deepEqual(loggedError, {
    code: 'ECONNREFUSED',
    category: 'network',
    message: 'Database network connection could not be established.',
  });
  assert.doesNotMatch(JSON.stringify(response.body), /secret|private|password/i);
});

test('database diagnostic requires a Supabase pooler URI for the expected project ref', () => {
  const valid = 'postgresql://postgres.abcdefghij:encoded%40password@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require';
  assert.equal(isExpectedIntegrationUrl(valid, 'abcdefghij'), true);
  assert.equal(isExpectedIntegrationUrl(valid, 'klmnopqrst'), false);
  assert.equal(isExpectedIntegrationUrl('postgres://postgres:secret@base:5432/postgres', 'abcdefghij'), false);
});
