-- 001_enable_vector.sql
-- Supabase may have vector in extensions schema; try public first, then extensions
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'vector extension may need to be enabled by Supabase admin';
    END;
END $$;
