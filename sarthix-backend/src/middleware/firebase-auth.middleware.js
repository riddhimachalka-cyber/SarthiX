import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

const appName = 'sarthix-api';
const firebaseApp = getApps().find((app) => app.name === appName)
  ?? initializeApp({
    projectId: config.firebaseProjectId,
  }, appName);

export function createFirebaseAuthMiddleware(verifyIdToken) {
  return createFirebaseMiddleware(verifyIdToken, false);
}

export function createOptionalFirebaseAuthMiddleware(verifyIdToken) {
  return createFirebaseMiddleware(verifyIdToken, true);
}

function createFirebaseMiddleware(verifyIdToken, optional) {
  return async function firebaseAuthMiddleware(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer ([^\s]+)$/i);
    if (!match && optional && !authorization) return next();
    if (!match) return next(new HttpError(401, 'A Firebase ID token is required'));

    try {
      const decodedToken = await verifyIdToken(match[1]);
      if (!decodedToken.uid || !decodedToken.phone_number) {
        return next(new HttpError(401, 'A verified phone-authenticated account is required'));
      }
      req.auth = decodedToken;
      return next();
    } catch (error) {
      if (typeof error?.code === 'string' && error.code.startsWith('auth/')) {
        return next(new HttpError(401, 'Firebase ID token is invalid or expired'));
      }
      console.error('Firebase ID-token verification is unavailable:', error?.code || error?.name || 'unknown error');
      return next(new HttpError(503, 'Account verification is temporarily unavailable'));
    }
  };
}

export function createFirebaseTokenVerifier(firebaseAuth, checkRevoked = config.firebaseCheckRevoked) {
  return (token) => firebaseAuth.verifyIdToken(token, checkRevoked);
}

export const firebaseAuthRequired = createFirebaseAuthMiddleware(
  createFirebaseTokenVerifier(getAuth(firebaseApp)),
);

export const optionalFirebaseAuth = createOptionalFirebaseAuthMiddleware(
  createFirebaseTokenVerifier(getAuth(firebaseApp)),
);
