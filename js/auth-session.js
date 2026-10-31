import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth } from "../firebase-config.js";

export async function expireLocalAuthSession() {
  if (!auth.currentUser) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Could not clear the expired Firebase session.", error);
    throw new Error("Your session expired, but this browser could not sign out. Reload the page and sign in again.");
  }
}
