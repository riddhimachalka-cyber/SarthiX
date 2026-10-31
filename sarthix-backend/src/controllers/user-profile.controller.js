import { HttpError } from '../utils/http-error.js';
import {
  getUserProfileByFirebaseUid,
  recordUserLogin,
  saveUserProfile,
  updateUserProfileByFirebaseUid,
} from '../repositories/user-profile.repository.js';

const REQUIRED_FIELDS = [
  'fullName', 'dob', 'pincode', 'state', 'district', 'tehsil',
  'village', 'address', 'userCategory', 'preferredLanguage',
];
const OPTIONAL_TEXT_FIELDS = [
  'gender', 'postOffice', 'gramPanchayat',
];
const TEXT_LIMITS = {
  fullName: 100,
  state: 100,
  district: 100,
  tehsil: 100,
  village: 100,
  postOffice: 100,
  gramPanchayat: 100,
  address: 1000,
};
const USER_CATEGORIES = new Set([
  'farmer', 'student', 'rural-citizen', 'asha-worker', 'panchayat-official',
  'job-seeker', 'entrepreneur', 'homemaker', 'other',
]);
const LANGUAGES = new Set(['en', 'hi', 'hinglish', 'mr', 'ta', 'gu', 'bn', 'other']);
const GENDERS = new Set(['male', 'female', 'other', 'prefer_not']);

export function validateAccountProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'profile must be an object');
  }

  const profile = {};
  for (const field of REQUIRED_FIELDS) {
    if (typeof input[field] !== 'string' || !input[field].trim()) {
      throw new HttpError(400, `profile.${field} is required`);
    }
    profile[field] = input[field].trim();
  }
  for (const field of OPTIONAL_TEXT_FIELDS) {
    const value = input[field];
    if (value == null || value === '') {
      profile[field] = null;
    } else if (typeof value === 'string') {
      profile[field] = value.trim() || null;
    } else {
      throw new HttpError(400, `profile.${field} must be a string`);
    }
  }

  for (const [field, maxLength] of Object.entries(TEXT_LIMITS)) {
    if (profile[field] != null && profile[field].length > maxLength) {
      throw new HttpError(400, `profile.${field} must be at most ${maxLength} characters`);
    }
  }
  if (!/^\d{6}$/.test(profile.pincode)) {
    throw new HttpError(400, 'profile.pincode must contain 6 digits');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.dob)
    || Number.isNaN(Date.parse(`${profile.dob}T00:00:00Z`))
    || new Date(`${profile.dob}T00:00:00Z`).toISOString().slice(0, 10) !== profile.dob
    || profile.dob >= new Date().toISOString().slice(0, 10)) {
    throw new HttpError(400, 'profile.dob must be a valid date in the past');
  }
  if (profile.gender && !GENDERS.has(profile.gender)) {
    throw new HttpError(400, 'profile.gender is not supported');
  }
  if (!USER_CATEGORIES.has(profile.userCategory)) {
    throw new HttpError(400, 'profile.userCategory is not supported');
  }
  if (!LANGUAGES.has(profile.preferredLanguage)) {
    throw new HttpError(400, 'profile.preferredLanguage is not supported');
  }
  for (const field of ['postOffice', 'gramPanchayat']) {
    if (profile[field]?.length > 100) {
      throw new HttpError(400, `profile.${field} must be at most 100 characters`);
    }
  }
  return profile;
}

function requireAuthenticatedPhoneUser(req) {
  if (!req.auth?.uid || !req.auth.phone_number) {
    throw new HttpError(401, 'A verified phone-authenticated account is required');
  }
  return req.auth;
}

export async function getOwnUserProfile(req, res, next) {
  try {
    const user = requireAuthenticatedPhoneUser(req);
    const profile = await getUserProfileByFirebaseUid(user.uid);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    return res.status(200).json({ success: true, profile });
  } catch (error) {
    return next(error);
  }
}

export async function createOwnUserProfile(req, res, next) {
  try {
    const user = requireAuthenticatedPhoneUser(req);
    const profile = validateAccountProfile(req.body?.profile);
    const savedProfile = await saveUserProfile(user.uid, user.phone_number, profile);
    if (!savedProfile) {
      return res.status(409).json({ success: false, message: 'A profile already exists for this account' });
    }
    return res.status(201).json({ success: true, profile: savedProfile });
  } catch (error) {
    return next(error);
  }
}

export async function updateOwnUserProfile(req, res, next) {
  try {
    const user = requireAuthenticatedPhoneUser(req);
    const profile = validateAccountProfile(req.body?.profile);
    const savedProfile = await updateUserProfileByFirebaseUid(user.uid, user.phone_number, profile);
    if (!savedProfile) return res.status(404).json({ success: false, message: 'Profile not found' });
    return res.status(200).json({ success: true, profile: savedProfile });
  } catch (error) {
    return next(error);
  }
}

export async function recordOwnLogin(req, res, next) {
  try {
    const user = requireAuthenticatedPhoneUser(req);
    const login = await recordUserLogin(user.uid, user.phone_number);
    if (!login) return res.status(404).json({ success: false, message: 'Account not found' });
    return res.status(200).json({ success: true, login });
  } catch (error) {
    return next(error);
  }
}
