ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS profile_context JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
  ON public.chat_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON public.chat_messages (session_id, created_at, id);
