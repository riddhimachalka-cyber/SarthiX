import { query } from '../config/database.js';
import { config } from '../config/env.js';
import { logDatabaseError } from '../utils/database-diagnostics.js';
import { createLocalMockResponses } from '../services/local-mock.service.js';

export function createDbHealthController({
  queryFn = query,
  logError = logDatabaseError,
  localMockMode = config.localMockMode,
  mockResponses = createLocalMockResponses(),
} = {}) {
  return async function dbHealth(req, res) {
    if (localMockMode) return res.status(200).json(mockResponses.databaseHealth());
    try {
      await queryFn('SELECT 1 as ok');
      return res.status(200).json({
        success: true,
        message: 'Database connection OK',
        status: 'ok',
      });
    } catch (error) {
      logError(error);
      return res.status(503).json({
        success: false,
        message: 'Database unavailable',
        status: 'error',
      });
    }
  };
}

export const dbHealth = createDbHealthController();
