import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  deleteSavedConversation,
  getChatHistory,
  getSavedConversation,
  groundedChat,
  listSavedConversations,
} from '../controllers/chat.controller.js';
import { optionalFirebaseAuth } from '../middleware/firebase-auth.middleware.js';

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many chat requests, please try again later.' },
});

router.use(optionalFirebaseAuth);
router.get('/history', getChatHistory);
router.get('/conversations', listSavedConversations);
router.get('/conversations/:conversationId', getSavedConversation);
router.delete('/conversations/:conversationId', deleteSavedConversation);
router.post('/', chatLimiter, groundedChat);

export default router;
