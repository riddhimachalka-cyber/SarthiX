import { GoogleGenAI } from '@google/genai';

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768;

export function validateEmbedding(embedding) {
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new TypeError(`Embedding must contain exactly ${EMBEDDING_DIMENSIONS} dimensions`);
  }
  let hasMagnitude = false;
  for (const value of embedding) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError('Embedding values must be finite numbers');
    }
    if (value !== 0) hasMagnitude = true;
  }
  if (!hasMagnitude) {
    throw new TypeError('Embedding magnitude must be greater than zero');
  }
  return embedding;
}

export function normalizeEmbedding(embedding) {
  validateEmbedding(embedding);
  const scale = embedding.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0);
  if (scale === 0) throw new TypeError('Embedding magnitude must be greater than zero');

  const scaled = embedding.map((value) => value / scale);
  const magnitude = Math.sqrt(scaled.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new TypeError('Embedding magnitude must be finite and greater than zero');
  }
  return scaled.map((value) => value / magnitude);
}

export class EmbeddingProvider {
  async embed() {
    throw new Error('EmbeddingProvider.embed must be implemented');
  }

  async embedMany(texts, options = {}) {
    return Promise.all(texts.map((text) => this.embed(text, options)));
  }
}

export class UnconfiguredEmbeddingProvider extends EmbeddingProvider {
  async embed() {
    const error = new Error('No embedding provider is configured');
    error.code = 'EMBEDDING_PROVIDER_UNAVAILABLE';
    error.statusCode = 503;
    throw error;
  }

  async embedMany() {
    return this.embed();
  }
}

const MAX_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 4;
const MAX_RETRY_DELAY_MS = 5000;

function providerError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function retryDelay(error, attempt, random) {
  const headers = error?.headers ?? error?.response?.headers;
  const retryAfter = typeof headers?.get === 'function'
    ? headers.get('retry-after')
    : headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, seconds * 1000));
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay) && dateDelay > 0) return Math.min(MAX_RETRY_DELAY_MS, dateDelay);
  }
  const exponential = Math.min(MAX_RETRY_DELAY_MS, 250 * (2 ** (attempt - 1)));
  return Math.round(exponential * (0.5 + random()));
}

export class GeminiEmbeddingProvider extends EmbeddingProvider {
  constructor({
    apiKey,
    client,
    sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    random = Math.random,
    maxAttempts = MAX_ATTEMPTS,
    timeoutMs = 30000,
  } = {}) {
    super();
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 6) {
      throw new TypeError('maxAttempts must be an integer from 1 to 6');
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
      throw new TypeError('timeoutMs must be a positive integer');
    }
    this.client = client ?? (apiKey
      ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          timeout: timeoutMs,
          retryOptions: { attempts: 1 },
        },
      })
      : null);
    this.sleep = sleep;
    this.random = random;
    this.maxAttempts = maxAttempts;
    this.timeoutMs = timeoutMs;
  }

  async embed(text, { taskType = 'RETRIEVAL_QUERY' } = {}) {
    const [embedding] = await this.embedMany([text], { taskType });
    return embedding;
  }

  async embedMany(texts, { taskType = 'RETRIEVAL_DOCUMENT' } = {}) {
    if (!this.client) {
      throw providerError('Gemini embedding is not configured; set GEMINI_API_KEY', 503, 'EMBEDDING_PROVIDER_UNAVAILABLE');
    }
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new TypeError('Embedding batch must contain at least one text');
    }
    if (texts.some((text) => typeof text !== 'string' || !text.trim())) {
      throw new TypeError('Embedding inputs must be non-empty strings');
    }
    if (!['RETRIEVAL_QUERY', 'RETRIEVAL_DOCUMENT'].includes(taskType)) {
      throw new TypeError('taskType must be RETRIEVAL_QUERY or RETRIEVAL_DOCUMENT');
    }

    const embeddings = [];
    for (let offset = 0; offset < texts.length; offset += MAX_BATCH_SIZE) {
      const batch = texts.slice(offset, offset + MAX_BATCH_SIZE);
      embeddings.push(...await this.#embedBatch(batch, taskType));
    }
    return embeddings;
  }

  async #embedBatch(texts, taskType) {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let response;
      try {
        response = await this.client.models.embedContent({
          model: GEMINI_EMBEDDING_MODEL,
          contents: texts,
          config: {
            taskType,
            outputDimensionality: EMBEDDING_DIMENSIONS,
            httpOptions: {
              timeout: this.timeoutMs,
              retryOptions: { attempts: 1 },
            },
          },
        });
      } catch (error) {
        const status = Number(error?.status);
        const retryable = !Number.isInteger(status) || status === 408 || status === 429 || status >= 500;
        if (!retryable) {
          throw providerError(`Gemini embedding request was rejected (HTTP ${status})`, 502, 'EMBEDDING_PROVIDER_FAILURE');
        }
        if (attempt === this.maxAttempts) {
          const rateLimited = status === 429;
          throw providerError(
            rateLimited ? 'Gemini embedding rate limit persisted after retries' : 'Gemini embedding service failed after retries',
            rateLimited ? 503 : 502,
            rateLimited ? 'EMBEDDING_RATE_LIMITED' : 'EMBEDDING_PROVIDER_FAILURE',
          );
        }
        await this.sleep(retryDelay(error, attempt, this.random));
        continue;
      }

      const embeddings = response?.embeddings;
      if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
        throw providerError('Gemini embedding returned an unexpected batch size', 502, 'EMBEDDING_PROVIDER_FAILURE');
      }
      try {
        return embeddings.map((item) => normalizeEmbedding(item?.values));
      } catch {
        throw providerError('Gemini embedding returned invalid vectors for the 768-dimension contract', 502, 'EMBEDDING_PROVIDER_FAILURE');
      }
    }

    throw providerError('Gemini embedding request failed', 502, 'EMBEDDING_PROVIDER_FAILURE');
  }
}

export function createEmbeddingProvider(apiKey) {
  return new GeminiEmbeddingProvider({ apiKey });
}
