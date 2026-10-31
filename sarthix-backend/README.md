# SarthiX Backend

Node.js + Express API using the existing Supabase PostgreSQL schema. Scheme ingestion and retrieval use Gemini embeddings; the grounded chat endpoint uses a separate Gemini text-generation service and returns only context-grounded answers with source attribution.

## Architecture

- `src/routes` and `src/controllers`: health, scheme, profile, and chat API surfaces.
- `src/services`: provenance validation, JSON/TXT/Markdown parsing, chunking, Gemini embedding adapter, retrieval orchestration, grounded-chat policy, and answer generation.
- `src/repositories`: parameterized PostgreSQL access to the existing `schemes`, `scheme_chunks`, `users`, and `user_profiles` tables.
- `src/db/migrations`: existing Phase 1/2 migrations. Phase 3 adds no migration and does not change the existing schema or vector index.
- `src/cli/ingest-schemes.js`: local, trusted-operator ingestion entry point.

The existing `scheme_chunks.embedding` column contract is `extensions.vector(768)`. Retrieval orders by `<=>` and relies on the existing HNSW `extensions.vector_cosine_ops` index. Retrieved chunks include scheme metadata and source provenance. Results below the default cosine-similarity threshold (`0.25`) are excluded; callers may set `minSimilarity` from `0` to `1` and `topK` from `1` to `20`.

## Requirements and setup

- Node.js 18 or later
- npm
- Existing Supabase PostgreSQL project with the Phase 1/2 schema and pgvector migrations already applied

```powershell
cd sarthix-backend
npm install
Copy-Item .env.example .env
```

### Local mock mode (no database or Gemini calls)

For frontend/API development without Supabase, start the backend in explicitly enabled local mock mode. It does not open a PostgreSQL connection, generate embeddings, or call Gemini. Database health reports that it was not tested; search returns no chunks; chat returns a clearly labeled local mock response with no scheme facts or sources. Mock responses include `"mode": "mock"` and must not be presented as verified scheme information.

Run from PowerShell in `sarthix-backend`:

```powershell
$env:NODE_ENV = 'development'
$env:LOCAL_MOCK_MODE = 'true'
npm run dev
```

The backend uses port 5000 unless `PORT` is set. Stop with Ctrl+C, then clear the process-local settings:

```powershell
Remove-Item Env:LOCAL_MOCK_MODE -ErrorAction SilentlyContinue
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

`LOCAL_MOCK_MODE` defaults to `false`; explicitly set it to `false` for normal PostgreSQL mode. Startup rejects `LOCAL_MOCK_MODE=true` with `NODE_ENV=production`. The flag must not be enabled for deployments or live-data testing. Mock mode does not provide sample government schemes and does not indicate that Supabase is available.

Configure `.env`:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `5000`) |
| `NODE_ENV` | Runtime environment |
| `LOCAL_MOCK_MODE` | Explicit local-only mock mode (`false` by default; production rejects `true`) |
| `FRONTEND_ORIGIN` | Allowed CORS origin |
| `DATABASE_URL` | Supabase Session Pooler URL (preferred) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL` | Alternative database connection settings |
| `GEMINI_API_KEY` | Server-only Google Gemini API key used for embeddings; never expose it to browser code |
| `GEMINI_TEXT_MODEL` | Separate text-generation model; defaults to `gemini-3.8-flash` |

Use an appropriately restricted database role and protect `.env`. Never put API keys or credentials into source files, frontend configuration, logs, or API responses. The provider sends the key in Google's `x-goog-api-key` request header.

The configured model is Google's `gemini-embedding-001`, with `outputDimensionality: 768` to match `extensions.vector(768)` in the existing schema. Calls use the official `@google/genai` SDK's `GoogleGenAI` client and `models.embedContent({ model, contents, config })` method. Google documents this model's task types and embedding API at [Gemini API embeddings](https://ai.google.dev/gemini-api/docs/embeddings). Query text uses `RETRIEVAL_QUERY`; scheme chunks use `RETRIEVAL_DOCUMENT`.

Text generation is separate from embeddings: the default `GEMINI_TEXT_MODEL` is `gemini-3.8-flash`, using the official SDK's `ai.interactions.create({ model, input, system_instruction })` method. Google currently demonstrates this model and SDK call in its [text generation guide](https://ai.google.dev/gemini-api/docs/text-generation), with model availability listed in the [Gemini model catalog](https://ai.google.dev/gemini-api/docs/models). Both services use the backend-only `GEMINI_API_KEY`; changing the text model does not change the embedding model or vector contract.

Google requires reduced `gemini-embedding-001` vectors to be manually L2-normalized. `normalizeEmbedding()` applies the same stable normalization process to provider responses, ingestion inputs immediately before persistence, and retrieval inputs before the vector query. It rejects zero-magnitude, non-finite, or incorrectly sized vectors.

## Ingestion

Only ingest documents gathered from a real, attributable source. Each document must include `schemeName`, `category`, explicit `applicability` (`central`, `state`, or `both`), `officialSourceUrl` (HTTPS), and `officialSourceName`, plus at least one content section. `lastVerifiedAt` and `verificationStatus: "verified"` together are required for verified publication; otherwise the scheme is explicitly marked `unverified` and saved as a draft, excluded from retrieval. The importer does not certify that a URL is official; operators must verify provenance and facts before marking data verified. Do not fill missing facts by guesswork.

### JSON format

```json
{
  "schemeName": "Name copied from the cited source",
  "category": "Category copied from the cited source",
  "description": "Description copied from the cited source",
  "benefits": ["Benefit copied from the cited source"],
  "eligibility": ["Criterion copied from the cited source"],
  "requiredDocuments": ["Document copied from the cited source"],
  "applicationProcedure": ["Step copied from the cited source"],
  "applicability": "central",
  "applicableStates": [],
  "officialSourceUrl": "https://verified-source.example/",
  "officialSourceName": "Source organisation",
  "lastVerifiedAt": "2026-01-15",
  "verificationStatus": "verified"
}
```

TXT and Markdown accept the same fields as `Key: value` lines or section headings such as `## Eligibility`, followed by the field content. A top-level Markdown heading can supply the scheme name. Use headings for `Category`, `Description`, `Benefits`, `Eligibility`, `Required Documents`, `Application Procedure`, `Applicability`, `Applicable States`, `Official Source URL`, `Source Organisation`, `Last Verified Date`, and `Verification Status`. List fields accept separate lines or comma/semicolon-separated values.

The local CLI accepts one UTF-8 file up to 256 KB and supports `.json`, `.txt`, `.md`, and `.markdown` extensions. It batches scheme chunks through Gemini, validates each response vector, and only then persists the scheme and vectors. Configure `GEMINI_API_KEY` before ingestion:

```powershell
npm run ingest -- .\scheme-source.json
```

The importer reuses an existing scheme with the same source URL, marks its previous chunks superseded, inserts current missing chunks, and avoids duplicate chunk text without deleting rows. No sample scheme is seeded. Public `POST /api/schemes/ingest` is intentionally disabled until real admin authentication and authorization are provided.

## API

Base path: `/api`. All responses are JSON.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend health |
| `GET` | `/api/health/db` | Database connectivity |
| `GET` | `/api/schemes/:id` | Scheme details, applicability, and provenance |
| `POST` | `/api/schemes/search` | Context retrieval; accepts question, optional profile context and filters |
| `POST` | `/api/chat` | Grounded answer using verified retrieved scheme context; no authenticated identity |
| `POST` | `/api/schemes/ingest` | Disabled (`503`) until admin authentication/authorization exists |
| `GET` | `/api/users/:userId/profile` | Disabled (`503`) until authenticated user authorization exists |
| `PUT` | `/api/users/:userId/profile` | Disabled (`503`) until authenticated user authorization exists |

When `LOCAL_MOCK_MODE=true`, `/api/health` and the database health, scheme search/details, and chat endpoints visibly report `mode: "mock"`. Search returns an empty result set. Chat returns a fixed insufficient-information response with no scheme facts or sources; it does not call Gemini. Database-dependent operations are guarded and cannot silently fall through to Supabase.

Example retrieval request:

```json
{
  "question": "What help is available for irrigation?",
  "profileContext": {
    "state": "Maharashtra",
    "is_farmer": true,
    "statedNeed": "irrigation support"
  },
  "filters": {
    "category": "Agriculture",
    "applicability": "central",
    "topK": 5,
    "minSimilarity": 0.25
  }
}
```

Accepted profile context is limited to age, state, district, occupation, farmer/student status, education level, income range, and the user's stated need. Only supplied values are used. State defaults to the supplied profile state unless an explicit state filter is provided. Profile context is request-scoped and is not persisted by retrieval.

The public profile routes remain unavailable rather than exposing records through caller-controlled user IDs. The profile repository implements reads and updates using the existing tables for later integration behind authentication. The ingestion API likewise fails closed; do not expose the local CLI or its database credentials through a network endpoint.

### Grounded chat

`POST /api/chat` accepts a JSON request such as:

```json
{
  "message": "What irrigation help may be relevant?",
  "profileContext": { "state": "Gujarat", "is_farmer": true },
  "history": [{ "role": "user", "content": "I need help with irrigation." }],
  "filters": { "topK": 5 }
}
```

The endpoint is not identity-authenticated because the project has no authentication system. It does not look up or persist profiles, does not accept or infer a user ID, and applies both the global API rate limit and a stricter 15-request-per-15-minute chat limit. Only explicitly supplied, validated profile context is used. Recent history is request-scoped, limited to 8 messages/6,000 characters, and is not stored. Requests are limited to 12,000 serialized characters and messages to 2,000 characters.

The route calls the existing scheme retrieval service with recent user messages and the current message (bounded to 2,000 characters) and a 0.35 minimum cosine-similarity floor, then passes only published chunks with verified metadata, a verification date, and an HTTPS official source to the separate answer-generation service. If no such context is available, it returns a localized insufficient-information response without calling text generation. Sources and structured eligibility/benefit/document/application fields in responses are built from retrieved metadata and matching verified sections, not generated by Gemini. Generated URLs are rejected. The model is instructed to avoid unsupported claims and eligibility guarantees, match the question's language, and ask only relevant follow-ups for missing details. Model output is schema-validated; provider details and prompts are not returned.

Example response:

```json
{
  "success": true,
  "answer": "The retrieved scheme may be relevant because ...",
  "relevance": "You asked about irrigation assistance.",
  "eligibility": ["Only retrieved eligibility details appear here."],
  "benefits": ["Only retrieved benefit details appear here."],
  "requiredDocuments": null,
  "applicationSteps": null,
  "missingInformation": ["Required documents were not present in the retrieved context."],
  "followUpQuestions": ["Which state do you live in?"],
  "sources": [{
    "schemeId": 12,
    "schemeName": "Name from ingested scheme metadata",
    "organisation": "Source organisation from metadata",
    "url": "https://official-source.example/path",
    "lastVerifiedAt": "2026-01-15T00:00:00.000Z"
  }],
  "insufficientInformation": false
}
```

Generated content is not itself proof that any official information has been ingested. Source-backed answers are only possible after operators ingest and verify real official documents.

## Retrieval flow

1. Validate the user question, optional self-provided profile context, top-K, threshold, and filters.
2. Pass the question and stated need to Gemini as a `RETRIEVAL_QUERY`.
3. Request 768 output dimensions and validate the returned vector has exactly 768 finite numbers.
4. Query `public.scheme_chunks` joined to `public.schemes`, apply state/category/applicability and publication filters, use `<=>`, threshold and top-K, and return source attribution.
5. The chat service filters out unpublished, unverified, undated, or non-HTTPS-source chunks. If verified context remains, the answer-generation service produces a structured, language-matched response; source attribution is assembled from retrieved metadata. Otherwise the API returns a localized insufficient-information response.

The Gemini embedding provider remains replaceable through the `EmbeddingProvider` interface. The answer generator is a separate service and uses a separately configurable text model. Both use bounded request timeouts; the embedding adapter also bounds retries. Missing credentials and provider failures return safe API errors; prompts, credentials, and provider response bodies are not exposed.

## Tests and commands

```powershell
npm test
npm run test:vector
npm run test:gemini:smoke
npm run dev
npm start
```

`npm run test:vector` is an opt-in live-database integration test. It requires both `RUN_VECTOR_INTEGRATION=true` and a dedicated non-production `VECTOR_TEST_DATABASE_URL` with the existing schema; it never uses the application `DATABASE_URL`. It inserts a temporary test record in a transaction and rolls it back. The normal unit/API suite needs no database.

`npm run test:gemini:smoke` is a separate opt-in live API test; it is not included in `npm test`. Set `RUN_GEMINI_SMOKE=true` and configure the backend-only `GEMINI_API_KEY` before running. It creates one query and one document embedding from harmless fixed sentences, checks model, dimensions, finite values, and normalized magnitude, and prints neither credentials nor vectors. It does not import or connect to the database.

## Security and operations

- Do not deploy the CLI as a public endpoint; restrict database credentials and source-document access.
- Do not expose user profiles until authentication authorizes the requested user.
- Configure real admin authentication/authorization before enabling ingestion.
- Keep user-provided profile fields minimal, request-scoped, and validated.
- Keep `GEMINI_API_KEY` only in backend-managed environment secrets; do not put it in frontend variables, source control, or client responses.
- Chat sends the user question, optional supplied profile values, recent history, and verified scheme context to Google's Gemini services. Do not include sensitive personal information in the message or profile context.
- Gemini quotas and billing apply to both ingestion and retrieval. Retry behavior is bounded; operators should monitor provider quotas and service errors.
- API errors use centralized JSON handling; unexpected failures return a generic `500`.
- Phase 4.2 does not run migrations or modify frontend files.

## Remaining Phase 4 requirements

Before frontend integration, provide authentication/authorization if the frontend needs account-bound profile or chat history; profile routes and public ingestion must remain disabled until then. Configure valid Gemini credentials and ingest real, reviewed official scheme documents before relying on answers. Define a model-version/re-embedding strategy before changing embedding models or dimensions. BHASHINI and persistent chat history remain out of scope.
