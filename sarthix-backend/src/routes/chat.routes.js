import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { groundedChat } from '../controllers/chat.controller.js';

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many chat requests, please try again later.' },
});

router.post('/', chatLimiter, groundedChat);

export default router;
