import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  connectAuthEmulator,
  getAuth
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDebByQoCoxG7BVGquxO-oKh4OwHNPLI0k",
  authDomain: "sarthix-72168.firebaseapp.com",
  projectId: "sarthix-72168",
  storageBucket: "sarthix-72168.firebasestorage.app",
  messagingSenderId: "897101117881",
  appId: "1:897101117881:web:ab4b8cc9d23fbb36e69e68"
};

const emulatorRequested = new URLSearchParams(window.location.search)
  .get("firebaseAuthEmulator") === "true";
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
if (emulatorRequested
  && (window.location.protocol !== "http:" || !localHosts.has(window.location.hostname))) {
  throw new Error("The Firebase Auth Emulator can only be enabled on a local HTTP site.");
}

export const useFirebaseEmulators = emulatorRequested;
const firebaseProjectId = useFirebaseEmulators ? "demo-sarthix-otp-test" : firebaseConfig.projectId;
const activeFirebaseConfig = useFirebaseEmulators
  ? {
      ...firebaseConfig,
      authDomain: `${firebaseProjectId}.firebaseapp.com`,
      projectId: firebaseProjectId
    }
  : firebaseConfig;

export const isFirebaseConfigured =
  Object.values(activeFirebaseConfig).every((value) => !value.startsWith("YOUR_")) &&
  activeFirebaseConfig.apiKey.length > 0 &&
  activeFirebaseConfig.projectId.length > 0 &&
  activeFirebaseConfig.appId.length > 0;

export const app = getApps().length ? getApp() : initializeApp(activeFirebaseConfig);
export const auth = getAuth(app);

if (useFirebaseEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}
