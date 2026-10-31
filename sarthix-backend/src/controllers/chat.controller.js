import { config } from '../config/env.js';
import { schemeRetrievalService } from './scheme.controller.js';
import { createAnswerGenerationService } from '../services/answer-generation.service.js';
import { createGroundedChatService, validateChatRequest } from '../services/grounded-chat.service.js';
import { createLocalMockResponses } from '../services/local-mock.service.js';
import {
  beginChatTurn,
  deleteChatConversation,
  getChatConversation,
  getLatestChatConversation,
  listChatConversations,
  saveAssistantChatMessage,
  validateConversationId,
} from '../repositories/chat-history.repository.js';
import { HttpError } from '../utils/http-error.js';

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
    let request = req.body;
    let chatTurn = null;
    if (req.auth) {
      const validated = validateChatRequest(req.body);
      chatTurn = await beginChatTurn({
        firebaseUid: req.auth.uid,
        phoneNumber: req.auth.phone_number,
        conversationId: validateConversationId(req.body?.conversationId),
        message: validated.question,
        profileContext: validated.profileContext,
      });
      if (!chatTurn) {
        throw new HttpError(403, 'Create your SarthiX account profile before saving chat history');
      }
      request = { ...req.body, history: chatTurn.history };
      res.set('X-Chat-Conversation-Id', String(chatTurn.conversationId));
    }

    const result = await chatService.chat(request);
    if (chatTurn) {
      await saveAssistantChatMessage(chatTurn.conversationId, result);
      result.conversationId = chatTurn.conversationId;
    }
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

export async function getChatHistory(req, res, next) {
  try {
    if (config.localMockMode) {
      return res.status(200).json({
        success: true,
        mode: 'mock',
        conversationId: null,
        profileContext: {},
        messages: [],
      });
    }
    if (!req.auth) {
      return res.status(200).json({
        success: true,
        conversationId: null,
        profileContext: {},
        messages: [],
      });
    }
    const conversation = await getLatestChatConversation(req.auth.uid, req.auth.phone_number);
    if (!conversation) {
      throw new HttpError(403, 'Create your SarthiX account profile before loading chat history');
    }
    return res.status(200).json({ success: true, ...conversation });
  } catch (error) {
    return next(error);
  }
}

function requireAccount(req) {
  if (!req.auth) throw new HttpError(401, 'Sign in to manage saved conversations');
}

export async function listSavedConversations(req, res, next) {
  try {
    requireAccount(req);
    const conversations = await listChatConversations(req.auth.uid, req.auth.phone_number);
    return res.status(200).json({ success: true, conversations });
  } catch (error) {
    return next(error);
  }
}

export async function getSavedConversation(req, res, next) {
  try {
    requireAccount(req);
    const conversationId = validateConversationId(Number(req.params.conversationId));
    const conversation = await getChatConversation(
      req.auth.uid,
      req.auth.phone_number,
      conversationId,
    );
    return res.status(200).json({ success: true, ...conversation });
  } catch (error) {
    return next(error);
  }
}

export async function deleteSavedConversation(req, res, next) {
  try {
    requireAccount(req);
    const conversationId = validateConversationId(Number(req.params.conversationId));
    const deleted = await deleteChatConversation(
      req.auth.uid,
      req.auth.phone_number,
      conversationId,
    );
    if (!deleted) throw new HttpError(404, 'Chat conversation not found');
    return res.status(200).json({ success: true, conversationId });
  } catch (error) {
    return next(error);
  }
}
