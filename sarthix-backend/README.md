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
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DB_SSL_CA_FILE` | Alternative database connection settings; production TLS verifies certificates and can use a trusted CA bundle |
| `GEMINI_API_KEY` | Server-only Google Gemini API key used for embeddings; never expose it to browser code |
| `GEMINI_TEXT_MODEL` | Separate text-generation model; defaults to `gemini-3.8-flash` |
| `FIREBASE_PROJECT_ID` | Firebase project used to verify client ID tokens (defaults to `sarthix-72168`) |
| `FIREBASE_CHECK_REVOKED` | `true` enables server-side revoked-session checks; defaults to `true` in production and `false` in development. Production cannot disable this. |

Profile API authorization verifies Firebase ID tokens against the configured project ID. Production also checks whether tokens have been revoked; configure Google Application Default Credentials (for example, the deployment platform's workload identity) for the backend runtime so Firebase Admin can perform that lookup. Do not commit or expose a service-account key. Development defaults to signature/expiry checks without a revocation lookup.

Use an appropriately restricted database role and protect `.env`. Production requires an explicit `FRONTEND_ORIGIN` and validates PostgreSQL TLS certificates; if the database uses a private CA, configure `DB_SSL_CA_FILE`. Local development allows localhost frontend ports and permits a self-signed database TLS chain for the configured local Supabase endpoint. Never put API keys or credentials into source files, frontend configuration, logs, or API responses. The provider sends the key in Google's `x-goog-api-key` request header.

### Frontend API configuration

The static frontend reads its API base URL from `js/config.js`. The default is `http://localhost:5000/api` for local development. For deployment, set `apiBaseUrl` there to the deployed backend's HTTPS API base (ending in `/api`); do not put credentials in this file. Set `FRONTEND_ORIGIN` in the backend environment to the exact deployed frontend origin, including scheme and port when applicable. The local default is `http://localhost:5500`.

The chat client sends `message`, recent `history`, and only supported `profileContext` fields to `POST /api/chat`. For signed-in accounts, history and the current chat profile context are persisted in PostgreSQL; guest chat is not persisted.

### Account profiles

Run `npm run migrate` after configuring PostgreSQL to apply migrations `004_firebase_user_profiles.sql`, `005_persist_login_and_chat_history.sql`, and `006_auth_account_constraints.sql`. Only after Firebase confirms the phone OTP does the frontend send the Firebase ID token to `POST /api/auth/session`; the backend verifies it, derives the UID, verified phone, and (if verified) email from token claims, and idempotently creates or updates one PostgreSQL `users` row. The API returns that PostgreSQL account identity; profile creation follows via the protected profile API. The verified phone number, Firebase UID, optional verified email, full name, login count, and last-login timestamp are stored in PostgreSQL `users`; all signup profile fields are stored in PostgreSQL `user_profiles`. UID and phone are unique, and each user has at most one profile. Signed-in chat sessions, complete user/assistant messages, and request-scoped profile context are stored in PostgreSQL `chat_sessions` and `chat_messages`; signed-in users can list, open, and delete their own saved conversations. Guests can chat, but their conversations are not persisted. The browser does not submit an account ID or phone number to establish the session. Firebase Authentication is used only as the OTP identity provider; passwords, OTP codes, and bearer tokens are never stored in PostgreSQL. Firebase client persistence manages the browser sign-in session; the backend uses stateless verified ID tokens, so a separate PostgreSQL `user_sessions` table is unnecessary. The application does not read or write Firestore.

For local Firebase Authentication Emulator testing, run `npx firebase-tools emulators:start --only auth --project demo-sarthix-otp-test` from the repository root and open the local frontend with `?firebaseAuthEmulator=true`. Start the backend with `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and `FIREBASE_PROJECT_ID=demo-sarthix-otp-test`. This local-only opt-in uses an isolated demo Firebase project and never sends real SMS.

The configured model is Google's `gemini-embedding-001`, with `outputDimensionality: 768` to match `extensions.vector(768)` in the existing schema. Calls use the official `@google/genai` SDK's `GoogleGenAI` client and `models.embedContent({ model, contents, config })` method. Google documents this model's task types and embedding API at [Gemini API embeddings](https://ai.google.dev/gemini-api/docs/embeddings). Query text uses `RETRIEVAL_QUERY`; scheme chunks use `RETRIEVAL_DOCUMENT`.

Text generation is separate from embeddings: the default `GEMINI_TEXT_MODEL` is `gemini-3.8-flash`, using the official SDK's `ai.models.generateContent({ model, contents, config })` method with structured JSON output. Google documents this API in its [text generation guide](https://ai.google.dev/gemini-api/docs/text-generation), with model availability listed in the [Gemini model catalog](https://ai.google.dev/gemini-api/docs/models). Both services use the backend-only `GEMINI_API_KEY`; changing the text model does not change the embedding model or vector contract. Provider rate limits (HTTP 429) require available quota or a later retry; the API returns a temporary-unavailable response instead of claiming the answer succeeded.

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
| `POST` | `/api/auth/session` | Verify Firebase ID token and create/update the corresponding PostgreSQL account after OTP confirmation |
| `POST` | `/api/chat` | Grounded answer using verified retrieved scheme context; optional Firebase auth enables history persistence |
| `GET` | `/api/chat/history` | Latest saved conversation for a signed-in user; guests receive an empty history |
| `GET` | `/api/chat/conversations` | Up to 50 saved conversations for the signed-in user |
| `GET` | `/api/chat/conversations/:conversationId` | One saved conversation owned by the signed-in user |
| `DELETE` | `/api/chat/conversations/:conversationId` | Delete one owned conversation and its messages |
| `POST` | `/api/schemes/ingest` | Disabled (`503`) until admin authentication/authorization exists |
| `GET` | `/api/users/profile` | Read the authenticated user's PostgreSQL profile |
| `POST` | `/api/users/profile` | Create the authenticated user's PostgreSQL profile after phone verification |
| `PUT` | `/api/users/profile` | Update the authenticated user's PostgreSQL profile |
| `POST` | `/api/users/login` | Record a successful signed-in login in PostgreSQL |

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

Accepted chat profile context is limited to age, state, district, occupation, farmer/student status, education level, income range, and the user's stated need. Only supplied values are used. State defaults to the supplied profile state unless an explicit state filter is provided. For signed-in accounts, this context is saved on the PostgreSQL chat session; guest context is request-scoped only.

Profile routes require a Firebase Admin verified ID token and phone number claim. Ownership is derived from that token rather than caller-controlled user IDs. The ingestion API remains disabled; do not expose the local CLI or its database credentials through a network endpoint.

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

Guest chat remains available without sign-in and is not persisted. When a valid Firebase ID token is supplied, the API derives account ownership from its verified UID and phone claim, stores the conversation in PostgreSQL, and loads the previous messages from that account's session rather than trusting client-supplied history. Each account's conversation session is private to that account. The API applies both the global rate limit and a stricter 15-request-per-15-minute chat limit. Profile context is validated and stored with the session. Requests are limited to 12,000 serialized characters and messages to 2,000 characters.

The route calls the existing scheme retrieval service with recent persisted user messages and the current message (bounded to 2,000 characters) and a 0.35 minimum cosine-similarity floor, then passes only published chunks with verified metadata, a verification date, and an HTTPS official source to the separate answer-generation service. If no such context is available, it returns a localized insufficient-information response without calling text generation. Sources and structured eligibility/benefit/document/application fields in responses are built from retrieved metadata and matching verified sections, not generated by Gemini. Generated URLs are rejected. The model is instructed to avoid unsupported claims and eligibility guarantees, match the question's language, and ask only relevant follow-ups for missing details. Model output is schema-validated; provider details and prompts are not returned.

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
npm run test:gemini:text-smoke
npm run dev
npm start
```

`npm run test:vector` is an opt-in live-database integration test. It requires both `RUN_VECTOR_INTEGRATION=true` and a dedicated non-production `VECTOR_TEST_DATABASE_URL` with the existing schema; it never uses the application `DATABASE_URL`. It inserts a temporary test record in a transaction and rolls it back. The normal unit/API suite needs no database.

`npm run test:gemini:smoke` is a separate opt-in live API test; it is not included in `npm test`. Set `RUN_GEMINI_SMOKE=true` and configure the backend-only `GEMINI_API_KEY` before running. It creates one query and one document embedding from harmless fixed sentences, checks model, dimensions, finite values, and normalized magnitude, and prints neither credentials nor vectors. It does not import or connect to the database.

`npm run test:gemini:text-smoke` is a separate opt-in live API test; it is not included in `npm test`. Set `RUN_GEMINI_TEXT_SMOKE=true` and configure the backend-only `GEMINI_API_KEY` before running. It sends one short non-scheme prompt, validates the structured response, and prints no generated content or credentials.

## Security and operations

- Do not deploy the CLI as a public endpoint; restrict database credentials and source-document access.
- Do not expose user profiles until authentication authorizes the requested user.
- Configure real admin authentication/authorization before enabling ingestion.
- Keep user-provided profile fields minimal, request-scoped, and validated.
- Keep `GEMINI_API_KEY` only in backend-managed environment secrets; do not put it in frontend variables, source control, or client responses.
- Chat sends the user question, optional supplied profile values, recent history, and verified scheme context to Google's Gemini services. Do not include sensitive personal information in the message or profile context.
- Gemini quotas and billing apply to both ingestion and retrieval. Retry behavior is bounded; operators should monitor provider quotas and service errors.
- API errors use centralized JSON handling; unexpected failures return a generic `500`.
- The test suite does not automatically run database migrations or call live external providers.

## Remaining Phase 4 requirements

Configure Firebase project ID and run database migrations before using account profiles or persistent chat in a deployment. Configure valid Gemini credentials and ingest real, reviewed official scheme documents before relying on answers. Define a model-version/re-embedding strategy before changing embedding models or dimensions. Current browser voice input/output uses the platform Web Speech APIs; this repository contains no Sarvam API adapter, so setting a Sarvam key alone does not enable Sarvam speech services.
