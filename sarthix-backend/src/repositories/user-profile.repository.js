import { getPool, query } from '../config/database.js';

const PROFILE_FIELDS = [
  'age', 'state', 'district', 'education_level', 'occupation',
  'is_student', 'is_farmer', 'family_income_range',
];

export async function getUserProfile(userId) {
  const result = await query(
    `SELECT u.id AS user_id, p.age, p.state, p.district, p.education_level, p.occupation,
      p.is_student, p.is_farmer, p.family_income_range
     FROM public.users u LEFT JOIN public.user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function updateUserProfile(userId, profile) {
  const columns = PROFILE_FIELDS.filter((field) => Object.hasOwn(profile, field));
  if (columns.length === 0) return getUserProfile(userId);

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT id FROM public.users WHERE id = $1 FOR UPDATE', [userId]);
    if (!user.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }

    const existing = await client.query(
      'SELECT id FROM public.user_profiles WHERE user_id = $1 ORDER BY id LIMIT 1 FOR UPDATE',
      [userId],
    );
    const values = columns.map((field) => profile[field]);
    let result;
    if (existing.rows.length) {
      const updates = columns.map((field, index) => `${field} = $${index + 1}`);
      result = await client.query(
        `UPDATE public.user_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${columns.length + 1}
         RETURNING user_id, age, state, district, education_level, occupation,
           is_student, is_farmer, family_income_range`,
        [...values, existing.rows[0].id],
      );
    } else {
      result = await client.query(
        `INSERT INTO public.user_profiles (user_id, ${columns.join(', ')})
         VALUES ($1, ${columns.map((_, index) => `$${index + 2}`).join(', ')})
         RETURNING user_id, age, state, district, education_level, occupation,
           is_student, is_farmer, family_income_range`,
        [userId, ...values],
      );
    }
    await client.query('COMMIT');
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
