import { establishFirebaseSession } from '../repositories/auth-session.repository.js';
import { HttpError } from '../utils/http-error.js';

export async function establishOwnAuthSession(req, res, next) {
  try {
    const { uid, phone_number: phoneNumber, email, email_verified: emailVerified } = req.auth ?? {};
    if (!uid || !phoneNumber) {
      throw new HttpError(401, 'A verified phone-authenticated account is required');
    }
    const user = await establishFirebaseSession({
      firebaseUid: uid,
      phoneNumber,
      email: emailVerified === true && typeof email === 'string' ? email : null,
    });
    return res.status(200).json({ success: true, authenticated: true, user });
  } catch (error) {
    return next(error);
  }
}
