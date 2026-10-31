import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export function resolveLocalMockMode(nodeEnv, flag) {
  if (flag == null || flag === '') return false;
  if (flag !== 'true' && flag !== 'false') {
    throw new Error('LOCAL_MOCK_MODE must be true or false');
  }
  if (flag === 'true' && nodeEnv === 'production') {
    throw new Error('LOCAL_MOCK_MODE is not allowed when NODE_ENV=production');
  }
  return flag === 'true';
}

export function resolveFirebaseCheckRevoked(nodeEnv, flag) {
  if (flag == null || flag === '') return nodeEnv === 'production';
  if (flag !== 'true' && flag !== 'false') {
    throw new Error('FIREBASE_CHECK_REVOKED must be true or false');
  }
  if (nodeEnv === 'production' && flag !== 'true') {
    throw new Error('FIREBASE_CHECK_REVOKED must be true in production');
  }
  return flag === 'true';
}

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  localMockMode: resolveLocalMockMode(process.env.NODE_ENV || 'development', process.env.LOCAL_MOCK_MODE),
  firebaseCheckRevoked: resolveFirebaseCheckRevoked(
    process.env.NODE_ENV || 'development',
    process.env.FIREBASE_CHECK_REVOKED,
  ),
  frontendOrigin: process.env.FRONTEND_ORIGIN
    || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5500'),
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'sarthix-72168',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    sslCaFile: process.env.DB_SSL_CA_FILE || '',
  },
};

function validateConfig() {
  if (config.nodeEnv === 'production' && !config.frontendOrigin) {
    throw new Error('FRONTEND_ORIGIN is required in production');
  }
  if (typeof config.port !== 'number' && isNaN(Number(config.port))) {
    throw new Error('Invalid PORT');
  }
  config.port = Number(config.port);
  if (typeof config.db.port !== 'number' && isNaN(Number(config.db.port))) {
    throw new Error('Invalid DB_PORT');
  }
  config.db.port = Number(config.db.port);
}

validateConfig();

export { config };
