import {
  RecaptchaVerifier,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPhoneNumber,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth, isFirebaseConfigured } from "../firebase-config.js";
import { establishAuthSession, recordOwnLogin, requestOwnProfile } from "./profile-api.js";
import { normalizeIndianPhoneNumber } from "./phone-number.js";

const form = document.getElementById("login-form");
const mobileInput = document.getElementById("mobile");
const mobileError = document.getElementById("mobile-error");
const otpGroup = document.getElementById("otp-input-group");
const otpInput = document.getElementById("otp-code");
const otpError = document.getElementById("otp-error");
const loginButton = document.getElementById("login-btn");
const loginButtonText = loginButton.querySelector(".btn-text");
const loader = loginButton.querySelector(".loader");
const resendButton = document.getElementById("login-with-otp");
const resendDivider = document.getElementById("otp-resend-divider");
const resendText = resendButton.querySelector(".resend-text");
const countdownText = resendButton.querySelector(".resend-countdown");
const recaptchaContainer = document.getElementById("recaptcha-container");
const toast = document.getElementById("toast");

let recaptchaVerifier = null;
let confirmationResult = null;
let countdownTimer = null;
let secondsLeft = 0;
let otpFlowStarted = false;
let otpRequestPending = false;
let pendingPhoneNumber = null;
let verifiedUser = null;
let redirecting = false;

onAuthStateChanged(auth, (user) => {
  if (user && !otpFlowStarted && !window.SarthiXAuthState?.registrationInProgress && !redirecting) {
    redirecting = true;
    window.location.replace("index.html");
  }
});

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = "toast is-visible " + (type === "error" ? "error" : "");
  window.setTimeout(() => toast.classList.remove("is-visible"), 4000);
}

function setLoading(loading, label) {
  loginButton.disabled = loading;
  loginButton.classList.toggle("loading", loading);
  loginButtonText.textContent = label;
  loader.style.display = loading ? "block" : "none";
}

function clearRecaptcha() {
  if (!recaptchaVerifier) return;
  recaptchaVerifier.clear();
  recaptchaVerifier = null;
  recaptchaContainer.replaceChildren();
}

function resetRecaptcha() {
  clearRecaptcha();
  recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
    size: "normal",
    "expired-callback": () => {
      confirmationResult = null;
      pendingPhoneNumber = null;
      window.clearInterval(countdownTimer);
      countdownTimer = null;
      resendButton.disabled = false;
      otpGroup.hidden = true;
      resendButton.hidden = true;
      resendDivider.hidden = true;
      loginButtonText.textContent = "Send OTP";
      showToast("Verification expired. Send a new OTP to continue.", "error");
    }
  });
}

function friendlyAuthError(error) {
  const messages = {
    "auth/invalid-phone-number": "Enter a valid Indian mobile number.",
    "auth/invalid-verification-code": "That OTP is incorrect. Check the code and try again.",
    "auth/code-expired": "That OTP has expired. Request a new code.",
    "auth/too-many-requests": "Too many attempts. Please wait before trying again.",
    "auth/unauthorized-domain": "This website address is not authorized in Firebase. Open this page using http://localhost:8765 or add its host in Firebase Authentication → Settings → Authorized domains.",
    "auth/missing-client-identifier": "Firebase could not verify this website. Use localhost or authorize this host in Firebase Authentication → Settings → Authorized domains.",
    "auth/captcha-check-failed": "reCAPTCHA could not verify this browser. Allow Google reCAPTCHA scripts/cookies, reload the page, and try again.",
    "auth/invalid-app-credential": "The reCAPTCHA check failed or expired. Reload the page and complete the security check again.",
    "auth/app-not-authorized": "This Firebase web app is not authorized for phone sign-in. Check the Firebase project and API-key restrictions.",
    "auth/invalid-api-key": "Firebase rejected the web API key. Check that firebase-config.js uses the API key for the configured Firebase project.",
    "auth/operation-not-allowed": "Firebase has blocked Phone Authentication. Enable Phone in Authentication → Sign-in method, allow India (+91) in SMS region policy, and confirm any test number is listed under Phone numbers for testing.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "auth/quota-exceeded": "SMS sending is temporarily unavailable. Please try again later."
  };
  return messages[error.code]
    || `We could not complete phone verification (${error.code || "unknown Firebase error"}). Check the Firebase Authentication setup and try again.`;
}

function validatedPhoneNumber() {
  const phone = normalizeIndianPhoneNumber(mobileInput.value);
  if (!phone) {
    mobileInput.classList.add("error");
    mobileError.classList.add("visible");
    mobileInput.focus();
    return null;
  }
  mobileInput.classList.remove("error");
  mobileError.classList.remove("visible");
  mobileInput.value = phone.nationalNumber;
  return phone.e164;
}

function startCountdown() {
  window.clearInterval(countdownTimer);
  secondsLeft = 30;
  resendButton.disabled = true;
  updateCountdown();
  countdownTimer = window.setInterval(() => {
    secondsLeft -= 1;
    updateCountdown();
    if (secondsLeft <= 0) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
      resendButton.disabled = false;
    }
  }, 1000);
}

function updateCountdown() {
  countdownText.textContent = `(${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")})`;
}

async function sendCode() {
  if (otpRequestPending) return;
  const phoneNumber = validatedPhoneNumber();
  if (!phoneNumber) return;
  if (!isFirebaseConfigured) {
    showToast("Add your Firebase Web App values to firebase-config.js first.", "error");
    return;
  }

  otpRequestPending = true;
  otpFlowStarted = true;
  setLoading(true, confirmationResult ? "Resending…" : "Sending OTP…");
  try {
    await setPersistence(auth, browserLocalPersistence);
    resetRecaptcha();
    await recaptchaVerifier.render();
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    pendingPhoneNumber = phoneNumber;
    otpGroup.hidden = false;
    resendButton.hidden = false;
    resendDivider.hidden = false;
    loginButtonText.textContent = "Verify OTP";
    resendText.textContent = "Resend OTP";
    startCountdown();
    showToast(isFirebaseAuthEmulator()
      ? "Test code requested. No SMS is sent in the local emulator; use the code shown in its terminal."
      : "OTP sent. Enter the 6-digit code from your SMS.");
    otpInput.focus();
  } catch (error) {
    console.error("Firebase phone sign-in request failed.", error);
    clearRecaptcha();
    showToast(friendlyAuthError(error), "error");
  } finally {
    otpRequestPending = false;
    setLoading(false, confirmationResult ? "Verify OTP" : "Send OTP");
  }
}

function isFirebaseAuthEmulator() {
  return new URLSearchParams(window.location.search).get("firebaseAuthEmulator") === "true";
}

async function verifyCode() {
  if (!verifiedUser) {
    if (!confirmationResult || !pendingPhoneNumber) {
      showToast("Send a new OTP before verifying.", "error");
      return;
    }
    if (validatedPhoneNumber() !== pendingPhoneNumber) {
      confirmationResult = null;
      pendingPhoneNumber = null;
      showToast("The mobile number changed. Send a new OTP for this number.", "error");
      return;
    }
    const code = otpInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      otpInput.classList.add("error");
      otpError.textContent = "Please enter the 6-digit OTP.";
      otpError.classList.add("visible");
      otpInput.focus();
      return;
    }
  }

  setLoading(true, verifiedUser ? "Connecting…" : "Verifying…");
  try {
    if (!verifiedUser) {
      const result = await confirmationResult.confirm(otpInput.value.trim());
      if (result.user.phoneNumber !== pendingPhoneNumber) {
        await signOut(auth);
        confirmationResult = null;
        pendingPhoneNumber = null;
        showToast("The verified phone number did not match the number used to request the OTP.", "error");
        return;
      }
      verifiedUser = result.user;
      confirmationResult = null;
      pendingPhoneNumber = null;
      window.clearInterval(countdownTimer);
      countdownTimer = null;
      resendButton.hidden = true;
      resendDivider.hidden = true;
    }
    await verifiedUser.getIdToken(true);
    await establishAuthSession();
    try {
      await requestOwnProfile();
    } catch (profileError) {
      if (profileError.kind !== "profile-api" || profileError.status !== 404) throw profileError;

      await signOut(auth);
      verifiedUser = null;
      otpFlowStarted = false;
      showToast("No SarthiX profile exists in PostgreSQL for this number. Please create your account.", "error");
      window.setTimeout(() => {
        window.location.hash = "signup";
      }, 1200);
      return;
    }

    await recordOwnLogin();
    redirecting = true;
    window.location.replace("index.html");
  } catch (error) {
    console.error("Firebase phone sign-in verification failed.", error);
    if (error.kind === "profile-api") {
      if (error.status === 409) {
        await signOut(auth);
        verifiedUser = null;
        otpFlowStarted = false;
      }
      showToast(error.message, "error");
    } else if (error.code === "auth/invalid-verification-code" || error.code === "auth/code-expired") {
      otpError.textContent = friendlyAuthError(error);
      otpError.classList.add("visible");
    } else {
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error("Could not clear the incomplete Firebase login session.", signOutError);
        }
      }
      confirmationResult = null;
      verifiedUser = null;
      pendingPhoneNumber = null;
      showToast(friendlyAuthError(error), "error");
    }
  } finally {
    setLoading(false, verifiedUser ? "Continue" : confirmationResult ? "Verify OTP" : "Send OTP");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (verifiedUser || confirmationResult) {
    await verifyCode();
  } else {
    await sendCode();
  }
});

resendButton.addEventListener("click", async () => {
  if (!resendButton.disabled) await sendCode();
});

mobileInput.addEventListener("input", () => {
  mobileInput.classList.remove("error");
  mobileError.classList.remove("visible");
  if (confirmationResult && `+91${mobileInput.value.trim()}` !== pendingPhoneNumber) {
    confirmationResult = null;
    pendingPhoneNumber = null;
    window.clearInterval(countdownTimer);
    countdownTimer = null;
    otpGroup.hidden = true;
    resendButton.hidden = true;
    resendDivider.hidden = true;
    loginButtonText.textContent = "Send OTP";
  }
});
otpInput.addEventListener("input", () => {
  otpInput.classList.remove("error");
  otpError.classList.remove("visible");
});
