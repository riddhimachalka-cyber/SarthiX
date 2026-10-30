-- 002_create_tables.sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  state VARCHAR(100),
  district VARCHAR(100),
  preferred_language VARCHAR(50),
  education_level VARCHAR(100),
  occupation VARCHAR(100),
  is_student BOOLEAN DEFAULT FALSE,
  is_farmer BOOLEAN DEFAULT FALSE,
  family_income_range VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  message_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schemes (
  id SERIAL PRIMARY KEY,
  scheme_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  applicable_states JSONB DEFAULT '[]',
  eligibility JSONB DEFAULT '{}',
  benefits JSONB DEFAULT '{}',
  required_documents JSONB DEFAULT '[]',
  application_steps JSONB DEFAULT '[]',
  official_source_url TEXT,
  official_source_name VARCHAR(255),
  last_verified_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheme_chunks (
  id SERIAL PRIMARY KEY,
  scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER,
  metadata JSONB DEFAULT '{}',
  embedding extensions.vector(768),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_scheme_chunks_scheme_id ON scheme_chunks(scheme_id);
CREATE INDEX IF NOT EXISTS idx_schemes_status ON schemes(status);
