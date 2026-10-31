import { validateProfileContext, validateRetrievalOptions } from './scheme-retrieval.service.js';
import { HttpError } from '../utils/http-error.js';

const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_TEXT = 1000;
const MAX_HISTORY_TOTAL = 6000;
const MAX_REQUEST_CHARACTERS = 12000;
const MIN_CHAT_SIMILARITY = 0.35;

const INSUFFICIENT_MESSAGES = {
  gu: 'મને આ પ્રશ્નનો વિશ્વસનીય જવાબ આપવા માટે ચકાસાયેલ યોજનાની માહિતી મળી નથી. કૃપા કરીને તમારું રાજ્ય અથવા યોજના વિશે વધુ વિગતો જણાવો, અથવા સત્તાવાર સરકારી સ્ત્રોત તપાસો.',
  hi: 'इस प्रश्न का भरोसेमंद उत्तर देने के लिए मुझे सत्यापित योजना जानकारी नहीं मिली। कृपया अपना राज्य या योजना के बारे में कुछ और जानकारी बताएं, या आधिकारिक सरकारी स्रोत देखें।',
  hinglish: 'Is sawal ka bharosemand jawab dene ke liye mujhe verified scheme jaankari nahi mili. Kripya apna state ya scheme ke baare mein thodi aur jaankari dein, ya official government source check karein.',
  en: 'I could not find verified scheme information relevant enough to answer this safely. Please share your state or a little more detail about the support you need, or check an official government source.',
};

function languageKey(question) {
  if (/[઀-૿]/u.test(question)) return 'gu';
  if (/[ऀ-ॿ]/u.test(question)) return 'hi';
  if (/\b(kya|kaise|mujhe|chahiye|hai|karu|karen|ke liye|yojana)\b/i.test(question)) return 'hinglish';
  return 'en';
}

function deriveFollowUps(question, profile, chunks) {
  const query = question.toLocaleLowerCase();
  const asksEligibility = /\b(eligible|eligibility|qualify|qualification|can i apply|am i eligible)\b|પાત્ર|લાયક|योग्य|पात्रता/i.test(question);
  if (!asksEligibility) return [];

  const eligibilityContext = chunks
    .filter((chunk) => chunk.chunk_metadata?.section === 'eligibility')
    .map((chunk) => chunk.chunk_text)
    .join('\n')
    .toLocaleLowerCase();
  const combined = `${query}\n${eligibilityContext}`;
  const questions = [];
  if (!profile.state && chunks.some((chunk) => ['state', 'both'].includes(chunk.chunk_metadata?.applicability))
    && !/\b(state|district)\b|રાજ્ય|જિલ્લો|राज्य|जिला/i.test(query)) {
    questions.push({ field: 'state', text: 'Which state do you live in?' });
  }
  if (!profile.age && /\bage\b|\baged\b|years old|વય|ઉંમર|आયુ|ઉમર|आयु|उम्र/i.test(combined)) {
    questions.push({ field: 'age', text: 'What is your age?' });
  }
  if (profile.is_farmer == null && /\bfarmers?\b|કૃષિ|ખેડૂત|किसान|कृषि/i.test(combined)) {
    questions.push({ field: 'is_farmer', text: 'Are you a farmer?' });
  }
  if (profile.is_student == null && /\bstudents?\b|વિદ્યાર્થી|छात्र|विद्यार्थी/i.test(combined)) {
    questions.push({ field: 'is_student', text: 'Are you currently a student?' });
  }
  if (!profile.education_level && /\beducation|educational qualification|degree|શિક્ષણ|અભ્યાસ|शिक्षा|पढ़ाई/i.test(combined)) {
    questions.push({ field: 'education_level', text: 'What is your highest education level?' });
  }
  const language = languageKey(question);
  const localized = {
    state: { hi: 'आप किस राज्य में रहते हैं?', gu: 'તમે કયા રાજ્યમાં રહો છો?', hinglish: 'Aap kis state mein rehte hain?' },
    age: { hi: 'आपकी उम्र क्या है?', gu: 'તમારી ઉંમર કેટલી છે?', hinglish: 'Aapki age kya hai?' },
    is_farmer: { hi: 'क्या आप किसान हैं?', gu: 'શું તમે ખેડૂત છો?', hinglish: 'Kya aap farmer hain?' },
    is_student: { hi: 'क्या आप अभी विद्यार्थी हैं?', gu: 'શું તમે હાલમાં વિદ્યાર્થી છો?', hinglish: 'Kya aap abhi student hain?' },
    education_level: { hi: 'आपकी उच्चतम शिक्षा क्या है?', gu: 'તમારું ઉચ્ચતમ શિક્ષણ શું છે?', hinglish: 'Aapki highest education kya hai?' },
  };
  return questions.slice(0, 3).map(({ field, text }) => localized[field]?.[language] ?? text);
}

function validateHistory(history) {
  if (history == null) return [];
  if (!Array.isArray(history) || history.length > MAX_HISTORY_TURNS) {
    throw new HttpError(400, `history must contain at most ${MAX_HISTORY_TURNS} messages`);
  }
  let total = 0;
  return history.map((turn) => {
    if (!turn || typeof turn !== 'object' || Array.isArray(turn)
      || !['user', 'assistant'].includes(turn.role)
      || typeof turn.content !== 'string' || !turn.content.trim()
      || turn.content.length > MAX_HISTORY_TEXT) {
      throw new HttpError(400, 'Each history item must have role user or assistant and non-empty content up to 1000 characters');
    }
    total += turn.content.length;
    if (total > MAX_HISTORY_TOTAL) throw new HttpError(400, 'Conversation history is too large');
    return { role: turn.role, content: turn.content.trim() };
  });
}

function validateChatRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
  let serialized;
  try {
    serialized = JSON.stringify(body);
  } catch {
    throw new HttpError(400, 'Request body is invalid');
  }
  if (serialized.length > MAX_REQUEST_CHARACTERS) {
    throw new HttpError(413, 'Chat request exceeds the supported size limit');
  }
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 2000) {
    throw new HttpError(400, 'message must be a non-empty string of at most 2000 characters');
  }
  if (body.profileContext != null && typeof body.profileContext !== 'object') {
    throw new HttpError(400, 'profileContext must be an object');
  }
  const profileContext = validateProfileContext(body.profileContext ?? {});
  const history = validateHistory(body.history);
  const filters = body.filters == null ? {} : body.filters;
  const retrievalOptions = validateRetrievalOptions(filters);
  return {
    question: body.message.trim(),
    profileContext,
    history,
    filters: { ...filters, ...retrievalOptions },
  };
}

function retrievalQuestion(question, history) {
  const previousQuestions = history
    .filter((turn) => turn.role === 'user')
    .slice(-2)
    .map((turn) => turn.content);
  return [...previousQuestions, question].join('\n').slice(-2000);
}

function verifiedSourceChunks(chunks) {
  return chunks.filter((chunk) => {
    if (chunk.status !== 'published'
      || chunk.chunk_metadata?.verificationStatus !== 'verified'
      || typeof chunk.similarity !== 'number'
      || !Number.isFinite(chunk.similarity)
      || chunk.similarity < MIN_CHAT_SIMILARITY
      || !chunk.last_verified_at
      || typeof chunk.scheme_name !== 'string'
      || typeof chunk.official_source_name !== 'string') return false;
    const verifiedAt = new Date(chunk.last_verified_at);
    if (Number.isNaN(verifiedAt.getTime()) || verifiedAt.getTime() > Date.now()) return false;
    try {
      return new URL(chunk.official_source_url).protocol === 'https:';
    } catch {
      return false;
    }
  });
}

function sourceList(chunks) {
  const sources = new Map();
  for (const chunk of chunks) {
    const key = `${chunk.scheme_id}:${chunk.official_source_url}`;
    if (sources.has(key)) continue;
    sources.set(key, {
      schemeId: chunk.scheme_id,
      schemeName: chunk.scheme_name,
      organisation: chunk.official_source_name,
      url: chunk.official_source_url,
      lastVerifiedAt: chunk.last_verified_at,
    });
  }
  return [...sources.values()];
}

function supportedSectionFacts(chunks, section) {
  const facts = chunks
    .filter((chunk) => chunk.chunk_metadata?.section === section)
    .map((chunk) => chunk.chunk_text.split('\n').slice(2).join('\n').trim())
    .filter(Boolean);
  return facts.length ? facts : null;
}

function requestsKnownProfileValue(question, profile) {
  const text = question.toLocaleLowerCase();
  return (Boolean(profile.state) && /state|district|રાજ્ય|જિલ્લો|राज्य|जिला/i.test(text))
    || (profile.age != null && /\bage\b|ઉંમર|ઉમર|उમર|उम्र|आयु/i.test(text))
    || (profile.is_farmer != null && /farmer|ખેડૂત|किसान|कृषि/i.test(text))
    || (profile.is_student != null && /student|વિદ્યાર્થી|छात्र|विद्यार्थी/i.test(text))
    || (Boolean(profile.education_level) && /education|degree|શિક્ષણ|અભ્યાસ|शिक्षा|पढ़ाई/i.test(text));
}

export function createGroundedChatService({ retrieval, answerGenerator }) {
  return {
    async chat(body) {
      const request = validateChatRequest(body);
      let retrieved;
      try {
        retrieved = await retrieval.retrieve({
          question: retrievalQuestion(request.question, request.history),
          profileContext: request.profileContext,
          filters: {
            ...request.filters,
            minSimilarity: Math.max(MIN_CHAT_SIMILARITY, request.filters.minSimilarity),
          },
        });
      } catch (error) {
        if (error instanceof HttpError) throw error;
        const safeError = new Error(
          error?.code === 'EMBEDDING_PROVIDER_UNAVAILABLE' || error?.code === 'EMBEDDING_RATE_LIMITED'
            ? 'Scheme retrieval is temporarily unavailable'
            : 'Scheme retrieval failed',
        );
        safeError.statusCode = error?.statusCode === 503 ? 503 : 502;
        safeError.code = 'SCHEME_RETRIEVAL_FAILURE';
        throw safeError;
      }
      const chunks = verifiedSourceChunks(retrieved.chunks);
      const sources = sourceList(chunks);
      if (chunks.length === 0) {
        const language = languageKey(request.question);
        const followUpQuestions = deriveFollowUps(request.question, retrieved.profileContext, []);
        if (followUpQuestions.length === 0 && !retrieved.profileContext.state) {
          followUpQuestions.push({
            hi: 'आप किस राज्य में रहते हैं?',
            gu: 'તમે કયા રાજ્યમાં રહો છો?',
            hinglish: 'Aap kis state mein rehte hain?',
            en: 'Which state do you live in?',
          }[language]);
        }
        return {
          answer: INSUFFICIENT_MESSAGES[language],
          relevance: '',
          eligibility: null,
          benefits: null,
          requiredDocuments: null,
          applicationSteps: null,
          missingInformation: ['verified scheme context'],
          followUpQuestions: followUpQuestions.slice(0, 3),
          sources,
          insufficientInformation: true,
        };
      }

      const generated = await answerGenerator.generate({
        question: request.question,
        profileContext: retrieved.profileContext,
        history: request.history,
        chunks,
      });
      const followUps = [
        ...deriveFollowUps(request.question, retrieved.profileContext, chunks),
        ...generated.followUpQuestions.filter((question) => !requestsKnownProfileValue(question, retrieved.profileContext)),
      ].filter((question, index, all) => all.indexOf(question) === index).slice(0, 3);

      return {
        ...generated,
        eligibility: supportedSectionFacts(chunks, 'eligibility'),
        benefits: supportedSectionFacts(chunks, 'benefits'),
        requiredDocuments: supportedSectionFacts(chunks, 'requiredDocuments'),
        applicationSteps: supportedSectionFacts(chunks, 'applicationProcedure'),
        followUpQuestions: followUps,
        sources,
        insufficientInformation: false,
      };
    },
  };
}

export { validateChatRequest, validateHistory, verifiedSourceChunks };
