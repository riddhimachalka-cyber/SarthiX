-- 003_create_vector_index.sql
CREATE INDEX IF NOT EXISTS idx_scheme_chunks_embedding_cosine ON public.scheme_chunks
USING hnsw (embedding extensions.vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
