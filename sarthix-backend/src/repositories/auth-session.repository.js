import { getPool } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';

export async function establishFirebaseSession({ firebaseUid, phoneNumber, email = null }) {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `INSERT INTO public.users (firebase_uid, phone_number, email, last_login_at, login_count)
       VALUES ($1, $2, $3, NOW(), 1)
       ON CONFLICT (firebase_uid) WHERE firebase_uid IS NOT NULL
       DO UPDATE SET
         phone_number = EXCLUDED.phone_number,
         email = COALESCE(EXCLUDED.email, public.users.email),
         updated_at = NOW(),
         last_login_at = NOW()
       RETURNING id, firebase_uid AS "firebaseUid", phone_number AS "phoneNumber",
         email, full_name AS "fullName", created_at AS "createdAt",
         updated_at AS "updatedAt", last_login_at AS "lastLoginAt",
         login_count AS "loginCount"`,
      [firebaseUid, phoneNumber, email],
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'This verified phone number is already linked to another account');
    }
    throw error;
  } finally {
    client.release();
  }
}
