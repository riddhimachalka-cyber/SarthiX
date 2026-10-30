import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5500',
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
  },
};

function validateConfig() {
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
