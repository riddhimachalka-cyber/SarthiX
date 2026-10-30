import { Router } from 'express';
import healthRoutes from './health.routes.js';
import dbHealthRoutes from './db-health.routes.js';
import schemeRoutes from './scheme.routes.js';
import userProfileRoutes from './user-profile.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/health/db', dbHealthRoutes);
router.use('/schemes', schemeRoutes);
router.use('/users', userProfileRoutes);

export default router;