import { HttpError } from '../utils/http-error.js';
import { createEmbeddingProvider } from '../services/embedding-provider.js';
import { createSchemeRetrievalService, getSchemeDetails } from '../services/scheme-retrieval.service.js';
import { config } from '../config/env.js';
import { createLocalMockResponses } from '../services/local-mock.service.js';

const localMockResponses = createLocalMockResponses();

export const schemeRetrievalService = createSchemeRetrievalService({
  embeddingProvider: createEmbeddingProvider(config.geminiApiKey),
});

export async function searchSchemes(req, res, next) {
  try {
    if (config.localMockMode) {
      return res.status(200).json(localMockResponses.schemeSearch(req.body));
    }
    const result = await schemeRetrievalService.retrieve({
      question: req.body?.question,
      profileContext: req.body?.profileContext,
      filters: req.body?.filters,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

export async function getScheme(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return next(new HttpError(400, 'Scheme id must be a positive integer'));
  if (config.localMockMode) {
    return res.status(404).json(localMockResponses.schemeDetails());
  }
  try {
    const scheme = await getSchemeDetails(id);
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found' });
    return res.status(200).json({ success: true, scheme });
  } catch (error) {
    return next(error);
  }
}

export function disabledIngestion(req, res) {
  return res.status(503).json({
    success: false,
    message: 'Public ingestion is disabled until admin authentication and authorization are configured. Use the local ingestion CLI.',
  });
}
