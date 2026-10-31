import { config } from './config/env.js';
import { shutdown as shutdownDatabase } from './config/database.js';
import app from './app.js';

const port = config.port;
const server = app.listen(port, () => {
  console.log(`SarthiX backend running on port ${port}`);
});

let shutdownPromise;

function shutdownServer() {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = new Promise((resolve) => {
    server.close(async (error) => {
      if (error) {
        console.error('HTTP server shutdown failed:', error.code || error.name || 'unknown error');
        process.exitCode = 1;
      }
      try {
        await shutdownDatabase();
      } catch (databaseError) {
        console.error('Database pool shutdown failed:', databaseError.code || databaseError.name || 'unknown error');
        process.exitCode = 1;
      }
      resolve();
    });
  });
  return shutdownPromise;
}

process.once('SIGINT', () => void shutdownServer());
process.once('SIGTERM', () => void shutdownServer());
