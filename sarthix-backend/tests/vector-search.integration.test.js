import pg from 'pg';

if (process.env.RUN_VECTOR_INTEGRATION !== 'true') {
  console.log('Vector integration test skipped (set RUN_VECTOR_INTEGRATION=true to run)');
  process.exit(0);
}

if (!process.env.VECTOR_TEST_DATABASE_URL) {
  console.error('Vector integration test requires VECTOR_TEST_DATABASE_URL for a dedicated non-production database');
  process.exit(1);
}

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.VECTOR_TEST_DATABASE_URL });
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const schemeRes = await client.query(
      `INSERT INTO schemes (scheme_name, description, status) VALUES ($1, $2, $3) RETURNING id`,
      ['_TEST_SCHEME_VECTOR', 'temp test', 'draft']
    );
    const schemeId = schemeRes.rows[0].id;
    
    const embeddingArr = Array(768).fill(0);
    const embedding = '[' + embeddingArr.join(',') + ']';
    
    const chunkRes = await client.query(
      `INSERT INTO scheme_chunks (scheme_id, chunk_text, chunk_index, embedding) VALUES ($1, $2, $3, $4::extensions.vector) RETURNING id`,
      [schemeId, '_TEST_CHUNK', 0, embedding]
    );
    const chunkId = chunkRes.rows[0].id;
    
    const queryEmbArr = Array(768).fill(0);
    const queryEmb = '[' + queryEmbArr.join(',') + ']';
    const simRes = await client.query(
      `SELECT id FROM scheme_chunks WHERE id = $1 ORDER BY embedding <=> $2::extensions.vector LIMIT 1`,
      [chunkId, queryEmb]
    );
    
    if (simRes.rows.length === 0 || simRes.rows[0].id !== chunkId) {
      throw new Error('Vector similarity query failed');
    }
    
    const idxRes = await client.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'scheme_chunks' AND indexname = 'idx_scheme_chunks_embedding_cosine'`
    );
    
    if (idxRes.rows.length === 0) {
      throw new Error('HNSW index not found');
    }
    
    console.log('Vector integration test PASSED');
  } catch (err) {
    throw err;
  } finally {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // ignore
    }
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Vector integration test FAILED');
  process.exit(1);
});
