import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { analyzeDocument } from '../controllers/document-analysis.controller.js';
import { MAX_DOCUMENT_BYTES, SUPPORTED_DOCUMENT_TYPES } from '../services/document-analysis.service.js';

export function createDocumentAnalysisRouter(handler = analyzeDocument) {
  const router = Router();
  const documentRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many document analyses. Please try again later.' },
  });
  const parseDocument = express.raw({
    type: [...SUPPORTED_DOCUMENT_TYPES],
    limit: MAX_DOCUMENT_BYTES,
  });

  router.post('/analyze', documentRateLimit, parseDocument, handler);
  return router;
}

export default createDocumentAnalysisRouter();
