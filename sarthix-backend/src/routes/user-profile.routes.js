import { Router } from 'express';
import { profileAuthRequired } from '../controllers/user-profile.controller.js';

const router = Router();

router.get('/:userId/profile', profileAuthRequired);
router.put('/:userId/profile', profileAuthRequired);

export default router;
