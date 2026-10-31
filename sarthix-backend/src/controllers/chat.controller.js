import { config } from '../config/env.js';
import { schemeRetrievalService } from './scheme.controller.js';
import { createAnswerGenerationService } from '../services/answer-generation.service.js';
import { createGroundedChatService } from '../services/grounded-chat.service.js';
import { createLocalMockResponses } from '../services/local-mock.service.js';

const localMockResponses = createLocalMockResponses();
const chatService = createGroundedChatService({
  retrieval: schemeRetrievalService,
  answerGenerator: createAnswerGenerationService({
    apiKey: config.geminiApiKey,
    model: config.geminiTextModel,
  }),
});

export async function groundedChat(req, res, next) {
  try {
    if (config.localMockMode) {
      return res.status(200).json(localMockResponses.chat(req.body));
    }
    const result = await chatService.chat(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}
