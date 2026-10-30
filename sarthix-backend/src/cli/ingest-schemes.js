import fs from 'node:fs/promises';
import path from 'node:path';
import { ingestSchemeDocument } from '../services/scheme-ingestion.service.js';
import { createEmbeddingProvider } from '../services/embedding-provider.js';
import { config } from '../config/env.js';
import { shutdown } from '../config/database.js';

const embeddingProvider = createEmbeddingProvider(config.geminiApiKey);
const filename = process.argv[2];
if (!filename) {
  console.error('Usage: npm run ingest -- <scheme.json|scheme.txt|scheme.md>');
  process.exitCode = 1;
} else {
  try {
    const absolutePath = path.resolve(process.cwd(), filename);
    const content = await fs.readFile(absolutePath, 'utf8');
    if (Buffer.byteLength(content, 'utf8') > 256 * 1024) {
      throw new Error('Document exceeds the 256 KB ingestion limit');
    }
    const result = await ingestSchemeDocument(path.basename(absolutePath), content, { embeddingProvider });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Scheme ingestion failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await shutdown();
  }
}
