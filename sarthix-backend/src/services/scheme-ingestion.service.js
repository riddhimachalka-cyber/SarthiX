import { ingestScheme as persistScheme } from '../repositories/scheme.repository.js';
import { chunkScheme } from './scheme-chunking.service.js';
import { parseSchemeDocument } from './scheme-document.service.js';
import { normalizeEmbedding } from './embedding-provider.js';

export async function ingestSchemeDocument(filename, content, {
  persist = persistScheme,
  embeddingProvider,
} = {}) {
  const scheme = parseSchemeDocument(filename, content);
  const chunks = chunkScheme(scheme);
  if (chunks.length === 0) throw new TypeError('Scheme document contains no text that can be embedded');
  if (!embeddingProvider || typeof embeddingProvider.embedMany !== 'function') {
    throw new TypeError('A batch-capable embeddingProvider is required for scheme ingestion');
  }
  const embeddings = await embeddingProvider.embedMany(
    chunks.map((chunk) => chunk.chunkText),
    { taskType: 'RETRIEVAL_DOCUMENT' },
  );
  if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
    throw new TypeError('Embedding provider must return one embedding per scheme chunk');
  }
  for (const [index, embedding] of embeddings.entries()) {
    chunks[index].embedding = normalizeEmbedding(embedding);
  }
  const result = await persist(scheme, chunks);
  return {
    ...result,
    schemeName: scheme.schemeName,
    verificationStatus: scheme.verificationStatus,
    chunksPrepared: chunks.length,
  };
}
