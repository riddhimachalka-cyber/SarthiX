import { Router } from 'express';
import { establishOwnAuthSession } from '../controllers/auth-session.controller.js';
import { firebaseAuthRequired } from '../middleware/firebase-auth.middleware.js';

const router = Router();

router.post('/session', firebaseAuthRequired, establishOwnAuthSession);

export default router;
