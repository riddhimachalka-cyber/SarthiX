import { searchSchemeChunks, getSchemeById } from '../repositories/scheme.repository.js';
import { normalizeEmbedding } from './embedding-provider.js';
import { HttpError } from '../utils/http-error.js';

const PROFILE_FIELDS = ['age', 'state', 'district', 'occupation', 'is_student', 'is_farmer', 'education_level', 'family_income_range', 'statedNeed'];

export function validateProfileContext(profile = {}) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new HttpError(400, 'profileContext must be an object');
  }
  const context = {};
  for (const field of PROFILE_FIELDS) {
    if (!Object.hasOwn(profile, field)) continue;
    const value = profile[field];
    if (field === 'age') {
      if (!Number.isInteger(value) || value < 0 || value > 120) throw new HttpError(400, 'profileContext.age must be an integer from 0 to 120');
    } else if (field === 'is_student' || field === 'is_farmer') {
      if (typeof value !== 'boolean') throw new HttpError(400, `profileContext.${field} must be a boolean`);
    } else if (typeof value !== 'string' || !value.trim() || value.length > 200) {
      throw new HttpError(400, `profileContext.${field} must be a non-empty string of at most 200 characters`);
    }
    context[field] = value;
  }
  return context;
}

export function validateRetrievalOptions(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new HttpError(400, 'filters must be an object');
  }
  const topK = options.topK ?? 5;
  const minSimilarity = options.minSimilarity ?? 0.25;
  if (!Number.isInteger(topK) || topK < 1 || topK > 20) throw new HttpError(400, 'topK must be an integer from 1 to 20');
  if (typeof minSimilarity !== 'number' || !Number.isFinite(minSimilarity) || minSimilarity < 0 || minSimilarity > 1) {
    throw new HttpError(400, 'minSimilarity must be a number from 0 to 1');
  }
  for (const field of ['state', 'category']) {
    if (options[field] != null && (typeof options[field] !== 'string' || !options[field].trim() || options[field].length > 100)) {
      throw new HttpError(400, `${field} must be a non-empty string of at most 100 characters`);
    }
  }
  if (options.applicability != null && !['central', 'state', 'both'].includes(options.applicability)) {
    throw new HttpError(400, 'applicability must be central, state, or both');
  }
  return { topK, minSimilarity };
}

export function createSchemeRetrievalService({ embeddingProvider, search = searchSchemeChunks }) {
  return {
    async retrieve({ question, profileContext = {}, filters = {} }) {
      if (typeof question !== 'string' || !question.trim() || question.length > 2000) {
        throw new HttpError(400, 'question must be a non-empty string of at most 2000 characters');
      }
      const profile = validateProfileContext(profileContext);
      const { topK, minSimilarity } = validateRetrievalOptions(filters);
      const state = filters.state ?? profile.state;
      const embeddingInput = [question.trim(), profile.statedNeed ? `Stated need: ${profile.statedNeed}` : ''].filter(Boolean).join('\n');
      const embedding = normalizeEmbedding(await embeddingProvider.embed(embeddingInput, { taskType: 'RETRIEVAL_QUERY' }));
      const chunks = await search({
        embedding,
        topK,
        minSimilarity,
        state,
        category: filters.category,
        applicability: filters.applicability,
      });
      return {
        profileContext: profile,
        chunks: chunks.map((chunk) => ({
          ...chunk,
          source: {
            url: chunk.official_source_url,
            organisation: chunk.official_source_name,
            lastVerifiedAt: chunk.last_verified_at,
            verificationStatus: chunk.chunk_metadata?.verificationStatus ?? 'unverified',
          },
        })),
      };
    },
  };
}

export async function getSchemeDetails(id) {
  return getSchemeById(id);
}
