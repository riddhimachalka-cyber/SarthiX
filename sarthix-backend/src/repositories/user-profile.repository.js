import { getPool, query } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';

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
    if (error.code === '23505' && error.constraint === 'idx_user_profiles_user_id') return null;
    if (error.code === '23505' && error.constraint === 'idx_users_phone_number') {
      throw new HttpError(409, 'This verified phone number is already linked to another account');
    }
    throw error;
  } finally {
    client.release();
  }
}

const ACCOUNT_PROFILE_COLUMNS = [
  ['full_name', 'fullName'],
  ['dob', 'dob'],
  ['gender', 'gender'],
  ['pincode', 'pincode'],
  ['state', 'state'],
  ['district', 'district'],
  ['post_office', 'postOffice'],
  ['tehsil', 'tehsil'],
  ['village', 'village'],
  ['gram_panchayat', 'gramPanchayat'],
  ['address', 'address'],
  ['user_category', 'userCategory'],
  ['preferred_language', 'preferredLanguage'],
];

const ACCOUNT_PROFILE_SELECT = `
  SELECT u.firebase_uid AS uid, u.phone_number AS "phoneNumber", u.email,
    COALESCE(p.full_name, u.full_name) AS "fullName", p.dob::text AS dob, p.gender,
    p.pincode, p.state, p.district, p.post_office AS "postOffice",
    p.tehsil, p.village, p.gram_panchayat AS "gramPanchayat",
    p.address, p.user_category AS "userCategory",
    p.preferred_language AS "preferredLanguage",
    p.created_at AS "createdAt", p.updated_at AS "updatedAt"
  FROM public.users u
  JOIN public.user_profiles p ON p.user_id = u.id`;

export async function getUserProfileByFirebaseUid(firebaseUid) {
  const result = await query(
    `${ACCOUNT_PROFILE_SELECT}
     WHERE u.firebase_uid = $1
     ORDER BY p.id
     LIMIT 1`,
    [firebaseUid],
  );
  return result.rows[0] ?? null;
}

async function persistAccountProfile(firebaseUid, phoneNumber, profile, createUser) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    let user;
    if (createUser) {
      user = await client.query(
        `INSERT INTO public.users (firebase_uid, phone_number, last_login_at, login_count)
         VALUES ($1, $2, NOW(), 1)
         ON CONFLICT (firebase_uid) WHERE firebase_uid IS NOT NULL
         DO UPDATE SET
           phone_number = EXCLUDED.phone_number,
           updated_at = NOW()
         RETURNING id`,
        [firebaseUid, phoneNumber],
      );
    } else {
      user = await client.query(
        'SELECT id FROM public.users WHERE firebase_uid = $1 AND phone_number = $2 FOR UPDATE',
        [firebaseUid, phoneNumber],
      );
    }

    if (!user.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }

    const userId = user.rows[0].id;
    const existing = await client.query(
      'SELECT id FROM public.user_profiles WHERE user_id = $1 ORDER BY id LIMIT 1 FOR UPDATE',
      [userId],
    );
    if (createUser && existing.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }
    const columnNames = ACCOUNT_PROFILE_COLUMNS.map(([column]) => column);
    const values = ACCOUNT_PROFILE_COLUMNS.map(([, field]) => profile[field]);
    values.push(calculateAge(profile.dob));

    let profileResult;
    if (existing.rows.length) {
      const updates = columnNames.map((column, index) => `${column} = $${index + 1}`);
      updates.push(`age = $${values.length}`);
      profileResult = await client.query(
        `UPDATE public.user_profiles
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length + 1}
         RETURNING id`,
        [...values, existing.rows[0].id],
      );
    } else {
      profileResult = await client.query(
        `INSERT INTO public.user_profiles (user_id, ${columnNames.join(', ')}, age)
         VALUES ($1, ${values.map((_, index) => `$${index + 2}`).join(', ')})
         RETURNING id`,
        [userId, ...values],
      );
    }

    await client.query(
      'UPDATE public.users SET full_name = $1, updated_at = NOW() WHERE id = $2',
      [profile.fullName, userId],
    );
    const result = await client.query(
      `${ACCOUNT_PROFILE_SELECT}
       WHERE u.id = $1 AND p.id = $2`,
      [userId, profileResult.rows[0].id],
    );
    await client.query('COMMIT');
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function calculateAge(dateOfBirth) {
  const birthDate = new Date(`${dateOfBirth}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasHadBirthday = today.getUTCMonth() > birthDate.getUTCMonth()
    || (today.getUTCMonth() === birthDate.getUTCMonth()
      && today.getUTCDate() >= birthDate.getUTCDate());
  if (!hasHadBirthday) age -= 1;
  return age;
}

export function saveUserProfile(firebaseUid, phoneNumber, profile) {
  return persistAccountProfile(firebaseUid, phoneNumber, profile, true);
}

export function updateUserProfileByFirebaseUid(firebaseUid, phoneNumber, profile) {
  return persistAccountProfile(firebaseUid, phoneNumber, profile, false);
}

export async function recordUserLogin(firebaseUid, phoneNumber) {
  const result = await query(
    `UPDATE public.users
     SET last_login_at = NOW(), login_count = login_count + 1, updated_at = NOW()
     WHERE firebase_uid = $1 AND phone_number = $2
     RETURNING last_login_at AS "lastLoginAt", login_count AS "loginCount"`,
    [firebaseUid, phoneNumber],
  );
  return result.rows[0] ?? null;
}
