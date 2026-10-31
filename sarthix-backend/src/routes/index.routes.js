import { Router } from 'express';
import healthRoutes from './health.routes.js';
import dbHealthRoutes from './db-health.routes.js';
import schemeRoutes from './scheme.routes.js';
import userProfileRoutes from './user-profile.routes.js';
import chatRoutes from './chat.routes.js';
import authRoutes from './auth.routes.js';
import documentAnalysisRoutes from './document-analysis.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/health/db', dbHealthRoutes);
router.use('/schemes', schemeRoutes);
router.use('/users', userProfileRoutes);
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/documents', documentAnalysisRoutes);

export default router;