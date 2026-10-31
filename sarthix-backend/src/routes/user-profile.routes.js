import { Router } from 'express';
import {
  createOwnUserProfile,
  getOwnUserProfile,
  recordOwnLogin,
  updateOwnUserProfile,
} from '../controllers/user-profile.controller.js';
import { firebaseAuthRequired } from '../middleware/firebase-auth.middleware.js';
import { config } from '../config/env.js';

const router = Router();

router.use((req, res, next) => {
  if (config.localMockMode) {
    return res.status(503).json({
      success: false,
      mode: 'mock',
      message: 'User profiles are unavailable in LOCAL_MOCK_MODE.',
    });
  }
  return next();
});
router.use(firebaseAuthRequired);
router.get('/profile', getOwnUserProfile);
router.post('/profile', createOwnUserProfile);
router.put('/profile', updateOwnUserProfile);
router.post('/login', recordOwnLogin);

export default router;
