import { getPool, query } from '../config/database.js';
import { normalizeEmbedding } from '../services/embedding-provider.js';

const SCHEME_COLUMNS = `scheme_name, description, category, applicable_states,
  eligibility, benefits, required_documents, application_steps, official_source_url,
  official_source_name, last_verified_at, status`;

function json(value) {
  return JSON.stringify(value);
}

export async function ingestScheme(scheme, chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new TypeError('At least one embedded scheme chunk is required');
  }
  for (const chunk of chunks) chunk.embedding = normalizeEmbedding(chunk.embedding);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      'SELECT id FROM public.schemes WHERE official_source_url = $1 ORDER BY id LIMIT 1 FOR UPDATE',
      [scheme.officialSourceUrl],
    );
    const status = scheme.verificationStatus === 'verified' ? 'published' : 'draft';
    const values = [
      scheme.schemeName, scheme.description, scheme.category, json(scheme.applicableStates),
      json(scheme.eligibility), json(scheme.benefits), json(scheme.requiredDocuments),
      json(scheme.applicationProcedure), scheme.officialSourceUrl, scheme.officialSourceName,
      scheme.lastVerifiedAt, status,
    ];

    let schemeId;
    if (found.rows[0]) {
      schemeId = found.rows[0].id;
      await client.query(
        `UPDATE public.schemes SET (${SCHEME_COLUMNS}) = ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12), updated_at = NOW() WHERE id = $13`,
        [...values, schemeId],
      );
      await client.query(
        `UPDATE public.scheme_chunks
         SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{superseded}', 'true'::jsonb, true)
         WHERE scheme_id = $1`,
        [schemeId],
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO public.schemes (${SCHEME_COLUMNS}) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12) RETURNING id`,
        values,
      );
      schemeId = inserted.rows[0].id;
    }

    let insertedChunks = 0;
    for (const [chunkIndex, chunk] of chunks.entries()) {
      const duplicate = await client.query(
        'SELECT id FROM public.scheme_chunks WHERE scheme_id = $1 AND chunk_text = $2 LIMIT 1',
        [schemeId, chunk.chunkText],
      );
      if (duplicate.rows.length) {
        await client.query(
          `UPDATE public.scheme_chunks SET metadata = $1::jsonb, embedding = $2::extensions.vector,
           chunk_index = $3 WHERE id = $4`,
          [json(chunk.metadata), json(chunk.embedding), chunkIndex, duplicate.rows[0].id],
        );
        continue;
      }
      await client.query(
        `INSERT INTO public.scheme_chunks (scheme_id, chunk_text, chunk_index, metadata, embedding)
         VALUES ($1, $2, $3, $4::jsonb, $5::extensions.vector)`,
        [schemeId, chunk.chunkText, chunkIndex, json(chunk.metadata), json(chunk.embedding)],
      );
      insertedChunks += 1;
    }
    await client.query('COMMIT');
    return { schemeId, chunksInserted: insertedChunks, status };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getSchemeById(id) {
  const result = await query(
    `SELECT id, ${SCHEME_COLUMNS},
      (SELECT metadata->>'applicability' FROM public.scheme_chunks
       WHERE scheme_id = schemes.id AND metadata ? 'applicability' ORDER BY chunk_index LIMIT 1) AS applicability,
      created_at, updated_at FROM public.schemes WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export function buildSchemeChunkSearchQuery({ embedding, topK, minSimilarity, state, category, applicability }) {
  const params = [JSON.stringify(normalizeEmbedding(embedding)), minSimilarity];
  const where = [
    'sc.embedding IS NOT NULL',
    `sc.metadata->>'superseded' IS DISTINCT FROM 'true'`,
    's.status = $3',
    's.official_source_url IS NOT NULL',
    's.official_source_name IS NOT NULL',
    '(1 - (sc.embedding <=> $1::extensions.vector)) >= $2',
  ];
  params.push('published');

  if (category) {
    params.push(category);
    where.push(`s.category = $${params.length}`);
  }
  if (applicability) {
    params.push(applicability);
    where.push(`sc.metadata->>'applicability' = $${params.length}`);
  }
  if (state) {
    params.push(JSON.stringify([state]));
    where.push(`(s.applicable_states @> $${params.length}::jsonb OR sc.metadata->>'applicability' IN ('central', 'both'))`);
  }

  params.push(topK);
  return {
    text: `SELECT sc.id AS chunk_id, sc.scheme_id, sc.chunk_text, sc.chunk_index, sc.metadata AS chunk_metadata,
      1 - (sc.embedding <=> $1::extensions.vector) AS similarity,
      s.id AS scheme_id, s.scheme_name, s.category, s.description, s.applicable_states,
      s.eligibility, s.benefits, s.required_documents, s.application_steps,
      s.official_source_url, s.official_source_name, s.last_verified_at, s.status
     FROM public.scheme_chunks sc
     JOIN public.schemes s ON s.id = sc.scheme_id
     WHERE ${where.join(' AND ')}
     ORDER BY sc.embedding <=> $1::extensions.vector
     LIMIT $${params.length}`,
    params,
  };
}

export async function searchSchemeChunks(filters, { queryFn = query } = {}) {
  const statement = buildSchemeChunkSearchQuery(filters);
  const result = await queryFn(statement.text, statement.params);
  return result.rows;
}
