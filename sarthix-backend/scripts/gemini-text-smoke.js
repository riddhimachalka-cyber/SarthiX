import { config } from '../src/config/env.js';
import { createAnswerGenerationService } from '../src/services/answer-generation.service.js';

if (process.env.RUN_GEMINI_TEXT_SMOKE !== 'true') {
  console.error('Opt-in smoke test disabled. Set RUN_GEMINI_TEXT_SMOKE=true to allow a live Gemini text request.');
  process.exitCode = 1;
} else if (!config.geminiApiKey) {
  console.error('Gemini text smoke test failed: GEMINI_API_KEY is not configured in the backend environment.');
  process.exitCode = 1;
} else {
  const generator = createAnswerGenerationService({
    apiKey: config.geminiApiKey,
    model: config.geminiTextModel,
    timeoutMs: 30000,
  });

  try {
    const result = await generator.generate({
      question: 'Reply with a short greeting. There is no verified scheme context.',
      profileContext: {},
      history: [],
      chunks: [],
    });
    console.log(JSON.stringify({
      success: true,
      provider: 'Google Gemini API (live)',
      model: config.geminiTextModel,
      structuredResponseValid: typeof result.answer === 'string'
        && typeof result.relevance === 'string'
        && Array.isArray(result.missingInformation)
        && Array.isArray(result.followUpQuestions),
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      provider: 'Google Gemini API (live)',
      model: config.geminiTextModel,
      code: error?.code ?? 'GEMINI_TEXT_PROVIDER_FAILURE',
      statusCode: error?.statusCode ?? null,
      providerStatus: error?.providerStatus ?? null,
      message: error?.message ?? 'Unknown provider failure',
    }, null, 2));
    process.exitCode = 1;
  }
}
