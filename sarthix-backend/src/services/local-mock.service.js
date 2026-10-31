import { validateProfileContext, validateRetrievalOptions } from './scheme-retrieval.service.js';
import { validateChatRequest } from './grounded-chat.service.js';
import { HttpError } from '../utils/http-error.js';

export const MOCK_MODE = 'mock';

function validateSearchRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 2000) {
    throw new HttpError(400, 'question must be a non-empty string of at most 2000 characters');
  }
  const profileContext = validateProfileContext(body.profileContext ?? {});
  const filters = body.filters == null ? {} : body.filters;
  const retrievalOptions = validateRetrievalOptions(filters);
  return { profileContext, filters: { ...filters, ...retrievalOptions } };
}

export function createLocalMockResponses() {
  return {
    databaseHealth() {
      return {
        success: true,
        message: 'LOCAL MOCK MODE: database connectivity was not tested.',
        status: 'mock',
        mode: MOCK_MODE,
      };
    },

    schemeSearch(body) {
      const { profileContext } = validateSearchRequest(body);
      return {
        success: true,
        mode: MOCK_MODE,
        message: 'LOCAL MOCK MODE: no scheme database or embedding provider was queried.',
        profileContext,
        chunks: [],
        demoData: false,
      };
    },

    schemeDetails() {
      return {
        success: false,
        mode: MOCK_MODE,
        message: 'LOCAL MOCK MODE: scheme details are unavailable; no real scheme data is loaded.',
      };
    },

    chat(body) {
      validateChatRequest(body);
      return {
        success: true,
        mode: MOCK_MODE,
        answer: 'LOCAL MOCK MODE: no database retrieval or AI answer was performed. No scheme facts or recommendations are available.',
        relevance: '',
        eligibility: null,
        benefits: null,
        requiredDocuments: null,
        applicationSteps: null,
        missingInformation: ['real scheme data and live retrieval'],
        followUpQuestions: [],
        sources: [],
        insufficientInformation: true,
      };
    },
  };
}
