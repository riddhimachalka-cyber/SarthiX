# Firebase Phone Authentication Setup

## Web app configuration

The Firebase Web App configuration for project `sarthix-72168` is set in `firebase-config.js`. These are Firebase web-app configuration values, not Admin SDK credentials. Never put service-account keys in this website.

## Firebase Console

1. In **Authentication → Sign-in method**, enable **Phone**.
2. In **Authentication → Settings → Authorized domains**, add the deployed host. For local browser development, open the site using `http://localhost:8765` (not `127.0.0.1`) and make sure `localhost` is listed. If using another host or port, authorize its hostname; ports are not part of the authorized-domain entry.
3. In **Authentication → Settings → SMS region policy**, allow **India (+91)**. If this country is blocked, Firebase rejects SMS with `auth/operation-not-allowed` even when the reCAPTCHA succeeds.
4. For repeatable tests, add a Firebase Authentication test phone number and test code under **Authentication → Sign-in method → Phone numbers for testing**. Firebase will not send an SMS to these numbers.
5. Enable **Cloud Firestore** and publish the owner-only rules below. The signup form writes the profile only after phone verification, to `users/{uid}`. Existing profile documents are never overwritten. The saved Hindi/English preference is applied on the home page and used for chatbot responses; Hindi replies use Devanagari rather than Hinglish.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow create: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.uid == userId
        && request.resource.data.phoneNumber == request.auth.token.phone_number;
      allow read: if request.auth != null && request.auth.uid == userId;
      allow update, delete: if false;
    }
  }
}
```

## Local testing

Serve this project over HTTP (for example, with VS Code Live Server); do not open the HTML files using `file://`. Browse to `http://localhost:<port>/login.html`, not `http://127.0.0.1:<port>/login.html`, so Firebase sees the authorized `localhost` domain. Allow third-party Google reCAPTCHA scripts/cookies and complete the checkbox/challenge if one appears. If Firebase reports `auth/unauthorized-domain`, add the hostname shown in the browser URL to **Authentication → Settings → Authorized domains**, then reload.

For Firebase's local emulators, start the Authentication and Firestore emulators on ports `9099` and `8080`, then set `useFirebaseEmulators` to `true` in `firebase-config.js`. The emulator setting is off by default. Any page that should require authentication can set `data-auth-required="true"` on its `<body>` element; no current page is marked protected because `index.html` is the public landing page and there is no separate dashboard in this project.

Test a new account by completing the signup form, sending an OTP, entering the valid test/emulator code, and confirming that a `users/{uid}` profile is created. Test login using that same phone number. Also check a wrong/expired code, resend after the 30-second countdown, sign out, then refresh `index.html` to verify sign-in persistence.

Real SMS OTP tests must use an authorized HTTPS domain. Browser SMS verification is not a reliable localhost test; use Firebase test phone numbers or the Authentication Emulator locally.
