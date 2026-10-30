import { Router } from 'express';
import { disabledIngestion, getScheme, searchSchemes } from '../controllers/scheme.controller.js';

const router = Router();

router.post('/search', searchSchemes);
router.post('/ingest', disabledIngestion);
router.get('/:id', getScheme);

export default router;
