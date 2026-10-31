import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth } from "../firebase-config.js";
import { requestOwnProfile } from "./profile-api.js";

const loginLinks = document.querySelectorAll("[data-auth-login]");
const logoutButtons = document.querySelectorAll("[data-auth-logout]");
const protectedPage = document.body.dataset.authRequired === "true";
const languageWasChosenByUser = () => {
  try {
    return window.localStorage.getItem("sarthix-language-user-selected") === "true";
  } catch (error) {
    console.error("Could not read the user's language preference.", error);
    return false;
  }
};

onAuthStateChanged(auth, async (user) => {
  loginLinks.forEach((link) => {
    link.hidden = Boolean(user);
  });
  logoutButtons.forEach((button) => {
    button.hidden = !user;
  });

  if (protectedPage && !user) {
    window.location.replace("login.html");
  }

  if (!user || languageWasChosenByUser()) return;

  try {
    const profile = await requestOwnProfile();
    const preferredLanguage = profile.preferredLanguage;
    const languageByPreference = { en: "en-IN", hi: "hi-IN", hinglish: "hi-IN" };
    const language = languageByPreference[preferredLanguage] || null;
    if (!language) return;

    try {
      window.localStorage.setItem("sarthix-language", language);
    } catch (error) {
      console.error("Could not save the user's preferred language locally.", error);
    }
    window.dispatchEvent(new CustomEvent("sarthix:preferred-language", {
      detail: { language }
    }));
  } catch (error) {
    if (error.status !== 404) {
      console.error("Could not load the user's preferred language.", error);
    }
  }
});

logoutButtons.forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    button.disabled = true;
    try {
      await signOut(auth);
      window.location.replace("index.html");
    } catch (error) {
      console.error("Firebase sign-out failed.", error);
      button.disabled = false;
      window.alert("We could not sign you out. Please try again.");
    }
  });
});
