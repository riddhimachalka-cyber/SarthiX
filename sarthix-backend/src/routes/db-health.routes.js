import { Router } from 'express';
import { dbHealth } from '../controllers/db-health.controller.js';

const router = Router();

router.get('/', dbHealth);

export default router;
