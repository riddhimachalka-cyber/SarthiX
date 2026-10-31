import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  connectAuthEmulator,
  getAuth
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  connectFirestoreEmulator,
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDebByQoCoxG7BVGquxO-oKh4OwHNPLI0k",
  authDomain: "sarthix-72168.firebaseapp.com",
  projectId: "sarthix-72168",
  storageBucket: "sarthix-72168.firebasestorage.app",
  messagingSenderId: "897101117881",
  appId: "1:897101117881:web:ab4b8cc9d23fbb36e69e68"
};

export const useFirebaseEmulators = false;

export const isFirebaseConfigured =
  Object.values(firebaseConfig).every((value) => !value.startsWith("YOUR_")) &&
  firebaseConfig.apiKey.length > 0 &&
  firebaseConfig.projectId.length > 0 &&
  firebaseConfig.appId.length > 0;

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (useFirebaseEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
