import { config } from '../config/env.js';
import {
  createDocumentAnalysisService,
  SUPPORTED_DOCUMENT_TYPES,
} from '../services/document-analysis.service.js';
import { HttpError } from '../utils/http-error.js';

const service = createDocumentAnalysisService({
  apiKey: config.geminiApiKey,
  model: config.geminiTextModel,
});

export function createDocumentAnalysisController(analysisService = service) {
  return async function analyzeDocument(req, res, next) {
    try {
      const contentType = req.get('Content-Type')?.split(';')[0]?.trim().toLowerCase();
      if (contentType !== 'application/json' && !SUPPORTED_DOCUMENT_TYPES.has(contentType)) {
        throw new HttpError(415, 'Supported request types are JSON text, PDF, JPEG, and PNG');
      }
      const language = req.get('Accept-Language')?.split(',')[0]?.trim();
      const question = req.get('X-Document-Question') || '';
      const input = Buffer.isBuffer(req.body)
        ? {
          file: req.body,
          mimeType: contentType,
          language,
          question,
        }
        : {
          ...(req.body || {}),
          language: req.body?.language || language,
          question: req.body?.question ?? question,
        };
      const analysis = await analysisService.analyze(input);
      res.json({ success: true, analysis });
    } catch (error) {
      next(error);
    }
  };
}

export const analyzeDocument = createDocumentAnalysisController();
