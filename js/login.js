import {
  RecaptchaVerifier,
  browserLocalPersistence,
  deleteUser,
  onAuthStateChanged,
  setPersistence,
  signInWithPhoneNumber,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db, isFirebaseConfigured } from "../firebase-config.js";

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
      showToast("Verification expired. Please complete the security check again.", "error");
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
    "auth/operation-not-allowed": "Firebase blocked this SMS request. Enable Phone in Authentication → Sign-in method and allow India (+91) in Authentication → Settings → SMS region policy.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "auth/quota-exceeded": "SMS sending is temporarily unavailable. Please try again later."
  };
  return messages[error.code] || "We could not complete phone verification. Please try again.";
}

function validatedPhoneNumber() {
  const digits = mobileInput.value.trim();
  if (!/^[6-9]\d{9}$/.test(digits)) {
    mobileInput.classList.add("error");
    mobileError.classList.add("visible");
    mobileInput.focus();
    return null;
  }
  mobileInput.classList.remove("error");
  mobileError.classList.remove("visible");
  return `+91${digits}`;
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
  const phoneNumber = validatedPhoneNumber();
  if (!phoneNumber) return;
  if (!isFirebaseConfigured) {
    showToast("Add your Firebase Web App values to firebase-config.js first.", "error");
    return;
  }

  otpFlowStarted = true;
  setLoading(true, confirmationResult ? "Resending…" : "Sending OTP…");
  try {
    await setPersistence(auth, browserLocalPersistence);
    resetRecaptcha();
    await recaptchaVerifier.render();
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    otpGroup.hidden = false;
    resendButton.hidden = false;
    resendDivider.hidden = false;
    loginButtonText.textContent = "Verify OTP";
    resendText.textContent = "Resend OTP";
    startCountdown();
    showToast("OTP sent. Enter the 6-digit code from your SMS.");
    otpInput.focus();
  } catch (error) {
    console.error("Firebase phone sign-in request failed.", error);
    clearRecaptcha();
    showToast(friendlyAuthError(error), "error");
  } finally {
    setLoading(false, confirmationResult ? "Verify OTP" : "Send OTP");
  }
}

async function verifyCode() {
  const code = otpInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    otpInput.classList.add("error");
    otpError.textContent = "Please enter the 6-digit OTP.";
    otpError.classList.add("visible");
    otpInput.focus();
    return;
  }

  setLoading(true, "Verifying…");
  try {
    const result = await confirmationResult.confirm(code);
    const profileRef = doc(db, "users", result.user.uid);
    const profileSnapshot = await getDoc(profileRef);
    if (!profileSnapshot.exists()) {
      await deleteUser(result.user);
      confirmationResult = null;
      showToast("No SarthiX account is registered with this number. Please create an account.", "error");
      window.setTimeout(() => {
        window.location.href = "signup.html";
      }, 1200);
      return;
    }

    redirecting = true;
    window.location.replace("index.html");
  } catch (error) {
    console.error("Firebase phone sign-in verification failed.", error);
    if (error.code === "auth/invalid-verification-code" || error.code === "auth/code-expired") {
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
      showToast(friendlyAuthError(error), "error");
    }
  } finally {
    setLoading(false, confirmationResult ? "Verify OTP" : "Send OTP");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (confirmationResult) {
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
});
otpInput.addEventListener("input", () => {
  otpInput.classList.remove("error");
  otpError.classList.remove("visible");
});
