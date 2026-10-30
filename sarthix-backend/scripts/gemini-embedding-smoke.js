import { config } from '../src/config/env.js';
import {
  createEmbeddingProvider,
  EMBEDDING_DIMENSIONS,
  GEMINI_EMBEDDING_MODEL,
  validateEmbedding,
} from '../src/services/embedding-provider.js';

const tolerance = 0.001;

function verifyEmbedding(embedding, taskType) {
  validateEmbedding(embedding);
  const magnitude = Math.hypot(...embedding);
  if (!Number.isFinite(magnitude) || Math.abs(magnitude - 1) > tolerance) {
    throw new Error(`${taskType} embedding magnitude ${magnitude} is outside the 1 ± ${tolerance} tolerance`);
  }
  return magnitude;
}

if (process.env.RUN_GEMINI_SMOKE !== 'true') {
  console.error('Opt-in smoke test disabled. Set RUN_GEMINI_SMOKE=true to allow live Gemini requests.');
  process.exitCode = 1;
} else if (!config.geminiApiKey) {
  console.error('Gemini smoke test failed: GEMINI_API_KEY is not configured in the backend environment.');
  process.exitCode = 1;
} else {
  try {
    const provider = createEmbeddingProvider(config.geminiApiKey);
    const queryEmbedding = await provider.embed(
      'A farmer is looking for help with irrigation costs.',
      { taskType: 'RETRIEVAL_QUERY' },
    );
    const documentEmbedding = await provider.embed(
      'Public guidance for eligible farmers seeking irrigation support.',
      { taskType: 'RETRIEVAL_DOCUMENT' },
    );

    const queryMagnitude = verifyEmbedding(queryEmbedding, 'Query');
    const documentMagnitude = verifyEmbedding(documentEmbedding, 'Document');
    console.log(JSON.stringify({
      success: true,
      provider: 'Google Gemini API (live)',
      model: GEMINI_EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      query: { taskType: 'RETRIEVAL_QUERY', dimensions: queryEmbedding.length, normalizedMagnitude: queryMagnitude },
      document: { taskType: 'RETRIEVAL_DOCUMENT', dimensions: documentEmbedding.length, normalizedMagnitude: documentMagnitude },
      tolerance,
    }, null, 2));
  } catch (error) {
    const message = String(error?.message ?? 'Unknown provider failure')
      .replaceAll(config.geminiApiKey, '[REDACTED]');
    console.error(JSON.stringify({
      success: false,
      provider: 'Google Gemini API (live)',
      model: GEMINI_EMBEDDING_MODEL,
      code: error?.code ?? 'EMBEDDING_PROVIDER_FAILURE',
      statusCode: error?.statusCode ?? error?.status ?? null,
      message,
    }, null, 2));
    process.exitCode = 1;
  }
}
