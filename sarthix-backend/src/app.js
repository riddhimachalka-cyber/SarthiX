import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import routes from './routes/index.routes.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.frontendOrigin,
  credentials: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Routes
app.use('/api', routes);

// 404 for unknown API routes
app.use('/api/*', notFoundHandler);
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
