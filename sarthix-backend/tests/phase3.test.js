import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../src/app.js';
import { parseSchemeDocument } from '../src/services/scheme-document.service.js';
import { chunkScheme } from '../src/services/scheme-chunking.service.js';
import { ingestSchemeDocument } from '../src/services/scheme-ingestion.service.js';
import { EMBEDDING_DIMENSIONS, GeminiEmbeddingProvider, normalizeEmbedding, validateEmbedding } from '../src/services/embedding-provider.js';
import { createSchemeRetrievalService, validateProfileContext } from '../src/services/scheme-retrieval.service.js';
import { buildSchemeChunkSearchQuery, ingestScheme, searchSchemeChunks } from '../src/repositories/scheme.repository.js';
import { errorHandler } from '../src/middleware/error.middleware.js';

const sourceUrl = 'https://sources.example.org/reference';

function document(overrides = {}) {
  return {
    schemeName: 'Test fixture scheme',
    category: 'Test category',
    description: 'Test description from an explicitly identified fixture source.',
    benefits: ['Fixture benefit'],
    eligibility: ['Fixture eligibility'],
    requiredDocuments: ['Fixture document'],
    applicationProcedure: ['Fixture application step'],
    applicability: 'state',
    applicableStates: ['Maharashtra'],
    officialSourceUrl: sourceUrl,
    officialSourceName: 'Fixture source organisation',
    lastVerifiedAt: '2025-01-15',
    verificationStatus: 'verified',
    ...overrides,
  };
}

test('JSON, TXT, and Markdown ingestion preserve fields and provenance', () => {
  const jsonScheme = parseSchemeDocument('fixture.json', JSON.stringify(document()));
  assert.equal(jsonScheme.schemeName, 'Test fixture scheme');
  assert.equal(jsonScheme.officialSourceUrl, sourceUrl);
  assert.equal(jsonScheme.verificationStatus, 'verified');
  assert.deepEqual(jsonScheme.requiredDocuments, ['Fixture document']);

  const text = [
    'Scheme Name: Text fixture',
    'Category: Test category',
    'Description: Text content',
    'Benefits:',
    '- First benefit',
    '- Second benefit',
    'Eligibility: Adult applicants',
    'Required Documents: Proof of identity; Proof of residence',
    'Application Procedure: Submit online',
    'Applicability: state',
    'Applicable States: Maharashtra',
    `Official Source URL: ${sourceUrl}`,
    'Source Organisation: Fixture source organisation',
  ].join('\n');
  const textScheme = parseSchemeDocument('fixture.txt', text);
  assert.equal(textScheme.schemeName, 'Text fixture');
  assert.equal(textScheme.benefits, 'First benefit\nSecond benefit');
  assert.equal(textScheme.verificationStatus, 'unverified');
  assert.equal(textScheme.lastVerifiedAt, null);

  const markdown = `# Markdown fixture
## Category
Test category
## Eligibility
Fixture criterion
## Applicability
central
## Official Source URL
${sourceUrl}
## Source Organisation
Fixture source organisation
## Benefits
Fixture benefit`;
  const markdownScheme = parseSchemeDocument('fixture.md', markdown);
  assert.equal(markdownScheme.schemeName, 'Markdown fixture');
  assert.equal(markdownScheme.eligibility, 'Fixture criterion');
  assert.equal(markdownScheme.applicability, 'central');
  assert.equal(markdownScheme.verificationStatus, 'unverified');
});

test('ingestion requires explicit applicability and provenance, and only marks dated data verified', () => {
  assert.throws(() => parseSchemeDocument('bad.json', JSON.stringify(document({ officialSourceUrl: '' }))), /officialSourceUrl/);
  assert.throws(() => parseSchemeDocument('bad.json', JSON.stringify(document({ applicability: undefined }))), /applicability/);
  assert.throws(() => parseSchemeDocument('bad.pdf', 'content'), /Only JSON, TXT, and Markdown/);
  assert.equal(
    parseSchemeDocument('unverified.json', JSON.stringify(document({ lastVerifiedAt: null }))).verificationStatus,
    'unverified',
  );
  assert.equal(
    parseSchemeDocument('unverified.json', JSON.stringify(document({ verificationStatus: 'verified', lastVerifiedAt: null }))).verificationStatus,
    'unverified',
  );
});

test('chunking preserves each relevant section and metadata without duplicate chunks', () => {
  const chunks = chunkScheme({
    ...document(),
    benefits: ['Shared content', 'Benefit detail'],
    eligibility: ['Shared content'],
  });
  assert.deepEqual(chunks.map((chunk) => chunk.metadata.section), [
    'description', 'benefits', 'eligibility', 'requiredDocuments', 'applicationProcedure',
  ]);
  assert.ok(chunks.every((chunk) => chunk.metadata.sourceUrl === sourceUrl));
  assert.equal(chunks.find((chunk) => chunk.metadata.section === 'eligibility').metadata.verificationStatus, 'verified');
  assert.equal(chunkScheme({ ...document(), benefits: ['same'], eligibility: ['same'] }).length, 5);
});

test('ingestion service parses and chunks before persisting, retaining unverified status', async () => {
  let saved;
  let taskOptions;
  const content = JSON.stringify(document({ verificationStatus: 'unverified', lastVerifiedAt: null }));
  const result = await ingestSchemeDocument('fixture.json', content, {
    embeddingProvider: {
      async embedMany(texts, options) {
        taskOptions = options;
        return texts.map(() => Array(EMBEDDING_DIMENSIONS).fill(0.1));
      },
    },
    persist: async (scheme, chunks) => {
      saved = { scheme, chunks };
      return { schemeId: 99, chunksInserted: chunks.length, status: 'draft' };
    },
  });
  assert.equal(saved.scheme.verificationStatus, 'unverified');
  assert.ok(saved.chunks.length > 0);
  assert.ok(saved.chunks.every((chunk) => chunk.embedding.length === EMBEDDING_DIMENSIONS
    && Math.abs(Math.hypot(...chunk.embedding) - 1) < 1e-12));
  assert.deepEqual(taskOptions, { taskType: 'RETRIEVAL_DOCUMENT' });
  assert.equal(result.schemeName, 'Test fixture scheme');
  assert.equal(result.status, 'draft');
});

test('ingestion validates every batch embedding before persistence', async () => {
  let persisted = false;
  await assert.rejects(() => ingestSchemeDocument('fixture.json', JSON.stringify(document()), {
    embeddingProvider: {
      async embedMany(texts) {
        return texts.map((_, index) => index === 0 ? [0] : Array(EMBEDDING_DIMENSIONS).fill(0.2));
      },
    },
    async persist() {
      persisted = true;
    },
  }), /exactly 768/);
  assert.equal(persisted, false);

  await assert.rejects(() => ingestSchemeDocument('fixture.json', JSON.stringify(document()), {
    embeddingProvider: {
      async embedMany(texts) {
        return texts.map(() => Array(EMBEDDING_DIMENSIONS).fill(0));
      },
    },
    async persist() { persisted = true; },
  }), /greater than zero/);
  assert.equal(persisted, false);

  await assert.rejects(() => ingestSchemeDocument('fixture.json', JSON.stringify(document()), {
    embeddingProvider: { async embedMany() { return []; } },
    async persist() { persisted = true; },
  }), /one embedding per scheme chunk/);
  assert.equal(persisted, false);
});

test('embedding validation enforces 768 finite numeric dimensions', () => {
  const valid = Array(EMBEDDING_DIMENSIONS).fill(0.25);
  assert.equal(validateEmbedding(valid), valid);
  assert.throws(() => validateEmbedding(valid.slice(1)), /exactly 768/);
  assert.throws(() => validateEmbedding([...valid.slice(0, -1), Number.NaN]), /finite numbers/);
});

test('embedding normalization produces unit vectors and rejects zero or invalid magnitude', () => {
  const normalized = normalizeEmbedding(Array(EMBEDDING_DIMENSIONS).fill(0.25));
  const magnitude = Math.hypot(...normalized);
  assert.ok(Math.abs(magnitude - 1) < 1e-12);
  assert.throws(() => normalizeEmbedding(Array(EMBEDDING_DIMENSIONS).fill(0)), /greater than zero/);
  assert.throws(() => normalizeEmbedding([...Array(EMBEDDING_DIMENSIONS - 1).fill(1), Infinity]), /finite numbers/);
});

test('Gemini provider uses the official SDK embedContent method and 768-dimensional config', async () => {
  const requests = [];
  const provider = new GeminiEmbeddingProvider({
    apiKey: 'server-only-test-key',
    client: {
      models: {
        async embedContent(params) {
          requests.push(params);
          return {
            embeddings: params.contents.map((_, index) => ({
              values: Array.from({ length: EMBEDDING_DIMENSIONS }, (_value, coordinate) =>
                coordinate === index ? index + 1 : 0),
            })),
          };
        },
      },
    },
  });

  const embeddings = await provider.embedMany(['first chunk', 'second chunk']);
  assert.deepEqual(requests[0], {
    model: 'gemini-embedding-001',
    contents: ['first chunk', 'second chunk'],
    config: {
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: EMBEDDING_DIMENSIONS,
      httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } },
    },
  });
  assert.equal(embeddings.length, 2);
  assert.equal(embeddings[0][0], 1);
  assert.equal(embeddings[1][1], 1);
  assert.ok(embeddings.every((embedding) => Math.abs(Math.hypot(...embedding) - 1) < 1e-12));

  await provider.embed('user question', { taskType: 'RETRIEVAL_QUERY' });
  assert.equal(requests[1].config.taskType, 'RETRIEVAL_QUERY');
});

test('Gemini provider rejects partial response batches without returning partial vectors', async () => {
  const provider = new GeminiEmbeddingProvider({
    apiKey: 'test-key',
    client: {
      models: {
        async embedContent() {
          return { embeddings: [{ values: Array(EMBEDDING_DIMENSIONS).fill(1) }] };
        },
      },
    },
  });
  await assert.rejects(provider.embedMany(['first chunk', 'second chunk']), /unexpected batch size/);
});

test('Gemini provider batches large inputs into bounded provider requests', async () => {
  const batchSizes = [];
  const provider = new GeminiEmbeddingProvider({
    apiKey: 'test-key',
    client: {
      models: {
        async embedContent({ contents }) {
          batchSizes.push(contents.length);
          return {
            embeddings: contents.map(() => ({ values: Array(EMBEDDING_DIMENSIONS).fill(0.01) })),
          };
        },
      },
    },
  });
  const embeddings = await provider.embedMany(Array.from({ length: 205 }, (_, index) => `chunk ${index}`));
  assert.deepEqual(batchSizes, [100, 100, 5]);
  assert.equal(embeddings.length, 205);
});

test('Gemini provider retries rate limits with Retry-After and returns safe errors on exhaustion', async () => {
  const sleeps = [];
  let calls = 0;
  const provider = new GeminiEmbeddingProvider({
    apiKey: 'test-secret',
    maxAttempts: 2,
    sleep: async (milliseconds) => sleeps.push(milliseconds),
    client: {
      models: {
        async embedContent() {
      calls += 1;
      if (calls === 1) {
        const error = new Error('rate limited');
        error.status = 429;
        error.headers = new Headers({ 'retry-after': '1' });
        throw error;
      }
          return { embeddings: [{ values: Array(EMBEDDING_DIMENSIONS).fill(0.2) }] };
        },
      },
    },
  });
  assert.equal((await provider.embed('query')).length, EMBEDDING_DIMENSIONS);
  assert.deepEqual(sleeps, [1000]);
  assert.equal(calls, 2);

  const limitedProvider = new GeminiEmbeddingProvider({
    apiKey: 'do-not-leak',
    maxAttempts: 2,
    sleep: async () => {},
    client: { models: { async embedContent() {
      const error = new Error('rate limited');
      error.status = 429;
      throw error;
    } } },
  });
  await assert.rejects(limitedProvider.embed('query'), (error) => {
    assert.equal(error.statusCode, 503);
    assert.equal(error.code, 'EMBEDDING_RATE_LIMITED');
    assert.doesNotMatch(error.message, /do-not-leak/);
    return true;
  });
});

test('Gemini provider retries transient provider failures', async () => {
  let attempts = 0;
  const provider = new GeminiEmbeddingProvider({
    apiKey: 'test-key',
    maxAttempts: 2,
    sleep: async () => {},
    client: { models: { async embedContent() {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error('service unavailable');
        error.status = 503;
        throw error;
      }
      return { embeddings: [{ values: Array(EMBEDDING_DIMENSIONS).fill(0.3) }] };
    } } },
  });
  assert.equal((await provider.embed('query')).length, EMBEDDING_DIMENSIONS);
  assert.equal(attempts, 2);
});

test('Gemini provider handles invalid vectors, permanent failures, and missing credentials safely', async () => {
  const invalidVector = new GeminiEmbeddingProvider({
    apiKey: 'test-key',
    client: { models: { async embedContent() { return { embeddings: [{ values: [0] }] }; } } },
  });
  await assert.rejects(invalidVector.embed('query'), /768-dimension contract/);

  const failedProvider = new GeminiEmbeddingProvider({
    apiKey: 'test-key',
    client: { models: { async embedContent() {
      const error = new Error('permission denied');
      error.status = 403;
      throw error;
    } } },
  });
  await assert.rejects(failedProvider.embed('query'), (error) => error.statusCode === 502 && /HTTP 403/.test(error.message));

  const unconfigured = new GeminiEmbeddingProvider();
  await assert.rejects(unconfigured.embed('query'), (error) => error.statusCode === 503 && /GEMINI_API_KEY/.test(error.message));
});

test('profile context allowlists only supplied supported values and validates them', () => {
  assert.deepEqual(validateProfileContext({ age: 35, state: 'Maharashtra', is_farmer: true, statedNeed: 'irrigation', secret: 'ignored' }), {
    age: 35, state: 'Maharashtra', is_farmer: true, statedNeed: 'irrigation',
  });
  assert.throws(() => validateProfileContext({ age: '35' }), /integer/);
  assert.throws(() => validateProfileContext({ is_student: 'yes' }), /boolean/);
});

test('retrieval passes profile state and ranking options to vector search and returns empty results safely', async () => {
  let providerInput;
  let searchInput;
  const service = createSchemeRetrievalService({
    embeddingProvider: {
      async embed(input) {
        providerInput = input;
        return Array(EMBEDDING_DIMENSIONS).fill(0.1);
      },
    },
    async search(input) {
      searchInput = input;
      return [];
    },
  });

  const result = await service.retrieve({
    question: 'Find relevant help',
    profileContext: { state: 'Maharashtra', statedNeed: 'irrigation support' },
    filters: { category: 'Agriculture', topK: 3, minSimilarity: 0.4 },
  });
  assert.equal(providerInput, 'Find relevant help\nStated need: irrigation support');
  assert.equal(searchInput.state, 'Maharashtra');
  assert.equal(searchInput.category, 'Agriculture');
  assert.equal(searchInput.topK, 3);
  assert.equal(searchInput.minSimilarity, 0.4);
  assert.ok(Math.abs(Math.hypot(...searchInput.embedding) - 1) < 1e-12);
  assert.deepEqual(result.chunks, []);
});

test('retrieval requests query-task embeddings from its configured provider', async () => {
  let options;
  const service = createSchemeRetrievalService({
    embeddingProvider: {
      async embed(_input, receivedOptions) {
        options = receivedOptions;
        return Array(EMBEDDING_DIMENSIONS).fill(0.1);
      },
    },
    async search() { return []; },
  });
  await service.retrieve({ question: 'Find assistance' });
  assert.deepEqual(options, { taskType: 'RETRIEVAL_QUERY' });
});

test('vector search uses cosine distance, threshold, provenance, filters, and deterministic top-K ordering', async () => {
  const statement = buildSchemeChunkSearchQuery({
    embedding: Array(EMBEDDING_DIMENSIONS).fill(1),
    topK: 4,
    minSimilarity: 0.3,
    state: 'Maharashtra',
    category: 'Agriculture',
    applicability: 'state',
  });
  assert.match(statement.text, /sc\.embedding <=> \$1::extensions\.vector/);
  assert.match(statement.text, /ORDER BY sc\.embedding <=> \$1::extensions\.vector/);
  assert.match(statement.text, /official_source_url/);
  assert.match(statement.text, /official_source_name/);
  assert.match(statement.text, /applicable_states @>/);
  assert.equal(statement.params.at(-1), 4);
  assert.ok(statement.params.includes('published'));

  let queryArgs;
  const rows = [{ chunk_id: 1 }, { chunk_id: 2 }];
  const result = await searchSchemeChunks({
    embedding: Array(EMBEDDING_DIMENSIONS).fill(1),
    topK: 2,
    minSimilarity: 0.25,
  }, {
    async queryFn(...args) {
      queryArgs = args;
      return { rows };
    },
  });
  assert.deepEqual(result, rows);
  assert.match(queryArgs[0], /ORDER BY sc\.embedding <=>/);

  const empty = await searchSchemeChunks({
    embedding: Array(EMBEDDING_DIMENSIONS).fill(1),
    topK: 2,
    minSimilarity: 0.25,
  }, { async queryFn() { return { rows: [] }; } });
  assert.deepEqual(empty, []);
});

test('vector query validates embedding dimensions before database access', async () => {
  let queried = false;
  await assert.rejects(() => searchSchemeChunks({
    embedding: [1],
    topK: 2,
    minSimilarity: 0.25,
  }, {
    async queryFn() {
      queried = true;
      return { rows: [] };
    },
  }), /exactly 768/);
  assert.equal(queried, false);
});

test('scheme repository rejects incomplete embeddings before opening a database connection', async () => {
  await assert.rejects(() => ingestScheme(document(), [{ embedding: [0] }]), /exactly 768/);
});

test('vector repository surfaces database query failures', async () => {
  await assert.rejects(() => searchSchemeChunks({
    embedding: Array(EMBEDDING_DIMENSIONS).fill(1),
    topK: 2,
    minSimilarity: 0.25,
  }, {
    async queryFn() {
      throw new Error('database unavailable');
    },
  }), /database unavailable/);
});

test('API validates retrieval input and fails closed for unavailable features', async (t) => {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  const invalidSearch = await fetch(`${baseUrl}/schemes/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '' }),
  });
  assert.equal(invalidSearch.status, 400);
  assert.equal((await invalidSearch.json()).success, false);

  const ingestion = await fetch(`${baseUrl}/schemes/ingest`, { method: 'POST' });
  assert.equal(ingestion.status, 503);
  const profile = await fetch(`${baseUrl}/users/1/profile`);
  assert.equal(profile.status, 503);

  const badId = await fetch(`${baseUrl}/schemes/nope`);
  assert.equal(badId.status, 400);
});

test('central error middleware preserves client status and hides unexpected internals', () => {
  let status;
  let body;
  const response = {
    headersSent: false,
    status(code) { status = code; return this; },
    json(payload) { body = payload; return this; },
  };
  errorHandler({ statusCode: 422, message: 'Invalid input' }, {}, response, () => {});
  assert.equal(status, 422);
  assert.equal(body.message, 'Invalid input');

  errorHandler(new Error('database connection detail'), {}, response, () => {});
  assert.equal(status, 500);
  assert.equal(body.message, 'Internal Server Error');
});
