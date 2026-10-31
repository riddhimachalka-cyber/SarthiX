import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { createDocumentAnalysisController } from '../src/controllers/document-analysis.controller.js';
import { createDocumentAnalysisRouter } from '../src/routes/document-analysis.routes.js';
import {
  createDocumentAnalysisService,
  MAX_DOCUMENT_BYTES,
} from '../src/services/document-analysis.service.js';

const validResponse = {
  documentType: { label: 'Payment notice', category: 'notice', sourceExcerpt: 'Payment notice' },
  explanation: { text: 'This notice asks the recipient to review a payment.' },
  purpose: { text: 'It explains a payment request.', sourceExcerpt: 'Please review your payment' },
  requestedAction: { text: 'Review the payment details.', sourceExcerpt: 'Please review your payment' },
  importantInformation: [{ label: 'Payment', value: 'The amount is not legible.', sourceExcerpt: '' }],
  actionItems: [{ text: 'Check the original notice.', sourceExcerpt: '' }],
  warnings: [],
  isUnclear: false,
  isIncomplete: false,
  clarityMessage: '',
  isLegalNotice: false,
  questionAnswer: 'The notice asks you to review the payment details.',
};

function fakeClient(responseText = JSON.stringify(validResponse), onGenerate = () => {}) {
  return {
    models: {
      async generateContent(request) {
        onGenerate(request);
        return { text: responseText };
      },
    },
  };
}

test('document analysis validates text and returns a bounded backend result', async () => {
  let request;
  const service = createDocumentAnalysisService({
    client: fakeClient(undefined, (value) => { request = value; }),
  });
  const result = await service.analyze({ text: 'A sample payment notice.', language: 'en-IN' });

  assert.equal(result.source, 'backend');
  assert.equal(result.documentType.label, 'Payment notice');
  assert.equal(request.config.responseMimeType, 'application/json');
  assert.match(request.config.systemInstruction, /untrusted data/i);
  assert.match(request.contents[0].parts[0].text, /A sample payment notice/);
  assert.equal(request.contents[0].parts.length, 1);
});

test('document analysis sends supported PDF bytes as inline Gemini data', async () => {
  let request;
  const service = createDocumentAnalysisService({
    client: fakeClient(undefined, (value) => { request = value; }),
  });
  const file = Buffer.from('%PDF-1.7 sample');
  await service.analyze({ file, mimeType: 'application/pdf', language: 'hi-IN' });

  assert.equal(request.contents[0].parts[1].inlineData.mimeType, 'application/pdf');
  assert.equal(request.contents[0].parts[1].inlineData.data, file.toString('base64'));
  assert.match(request.contents[0].parts[0].text, /Hindi \(Devanagari script\)/);
});

test('document analysis rejects invalid input before calling Gemini', async () => {
  let called = false;
  const service = createDocumentAnalysisService({
    client: fakeClient(undefined, () => { called = true; }),
  });

  await assert.rejects(service.analyze({ text: '   ' }), { statusCode: 400 });
  await assert.rejects(service.analyze({ text: 'valid', language: 'fr-FR' }), { statusCode: 400 });
  await assert.rejects(service.analyze({
    file: Buffer.from('not a pdf'),
    mimeType: 'application/pdf',
  }), { statusCode: 400 });
  await assert.rejects(service.analyze({
    file: Buffer.alloc(MAX_DOCUMENT_BYTES + 1),
    mimeType: 'image/png',
  }), { statusCode: 413 });
  assert.equal(called, false);
});

test('document analysis rejects malformed model output instead of returning success-shaped data', async () => {
  const service = createDocumentAnalysisService({ client: fakeClient('not json') });
  await assert.rejects(
    service.analyze({ text: 'A sample notice.' }),
    { statusCode: 502, code: 'GEMINI_INVALID_RESPONSE' },
  );
});

test('document analysis API accepts raw PDF and pasted-text requests', async (t) => {
  const received = [];
  const handler = createDocumentAnalysisController({
    async analyze(input) {
      received.push(input);
      return { source: 'backend', documentType: { label: 'Test' }, questionAnswer: 'Answer' };
    },
  });
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use('/api/documents', createDocumentAnalysisRouter(handler));
  app.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const address = server.address();
  const apiUrl = `http://127.0.0.1:${address.port}/api/documents/analyze`;

  const pdfResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf', 'Accept-Language': 'hi-IN' },
    body: Buffer.from('%PDF-1.7'),
  });
  assert.equal(pdfResponse.status, 200);
  assert.equal((await pdfResponse.json()).analysis.source, 'backend');
  assert.equal(Buffer.isBuffer(received[0].file), true);
  assert.equal(received[0].mimeType, 'application/pdf');
  assert.equal(received[0].language, 'hi-IN');

  const unsupportedResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: Buffer.from('unsupported'),
  });
  assert.equal(unsupportedResponse.status, 415);

  const textResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Sample notice', language: 'en-IN', question: 'What is requested?' }),
  });
  assert.equal(textResponse.status, 200);
  assert.equal(received[1].text, 'Sample notice');
  assert.equal(received[1].question, 'What is requested?');
});
