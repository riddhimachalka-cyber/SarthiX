import {
  RecaptchaVerifier,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPhoneNumber,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth, isFirebaseConfigured } from "../firebase-config.js";
import { establishAuthSession, requestOwnProfile } from "./profile-api.js";
import { normalizeIndianPhoneNumber } from "./phone-number.js";

const signupCard = document.querySelector("#signup-panel .signup-card");
const getSignupElement = (id) => signupCard.querySelector(`#${id}`);
const form = getSignupElement("signup-form");
const toast = document.getElementById("signup-toast");
const nextButton = getSignupElement("next-btn");
const nextText = nextButton.querySelector(".next-text");
const nextLoader = nextButton.querySelector(".loader");
const otpMobile = getSignupElement("otp-mobile");
const otpCode = getSignupElement("otp-code");
const otpSendGroup = getSignupElement("otp-send-group");
const otpInputGroup = getSignupElement("otp-input-group");
const sendOtpButton = getSignupElement("send-otp-btn");
const resendButton = getSignupElement("resend-otp");
const otpSuccess = getSignupElement("otp-success");
const recaptchaContainer = getSignupElement("recaptcha-container");

let currentStep = 1;
let recaptchaVerifier = null;
let confirmationResult = null;
let verifiedUser = null;
let otpFlowStarted = false;
let otpRequestPending = false;
let pendingPhoneNumber = null;
let countdownTimer = null;
let secondsLeft = 0;
let profileDraft = null;
let redirecting = false;
window.SarthiXAuthState = window.SarthiXAuthState || { registrationInProgress: false };

onAuthStateChanged(auth, (user) => {
  if (user && !verifiedUser && !otpFlowStarted && !redirecting) {
    redirecting = true;
    window.location.replace("index.html");
  }
});

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = "signup-toast show " + (type === "error" ? "error" : "");
  window.setTimeout(() => toast.classList.remove("show"), 4000);
}

function setButtonLoading(button, loading, textElement, loaderElement, label) {
  button.disabled = loading;
  button.classList.toggle("loading", loading);
  textElement.textContent = label;
  loaderElement.style.display = loading ? "block" : "none";
}

function showFieldError(input, message) {
  input.classList.add("error");
  const error = input.closest(".form-group").querySelector(".error-text");
  if (error) {
    error.textContent = message;
    error.classList.add("visible");
  }
  input.focus();
}

function clearFieldError(input) {
  input.classList.remove("error");
  const error = input.closest(".form-group")?.querySelector(".error-text");
  if (error) error.classList.remove("visible");
}

function validIndianMobile(value) {
  return normalizeIndianPhoneNumber(value) !== null;
}

const dobInput = getSignupElement("dob");
dobInput.max = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);

function validateStep(step) {
  let valid = true;
  const check = (id, message, pattern) => {
    const input = getSignupElement(id);
    const value = input.value.trim();
    if (!value || (pattern && !pattern.test(value))) {
      showFieldError(input, message);
      valid = false;
    } else {
      clearFieldError(input);
    }
  };

  if (step === 1) {
    check("full-name", "Please enter your full name.");
    check("dob", "Please enter your date of birth.");
    const mobile = getSignupElement("mobile");
    const normalizedMobile = normalizeIndianPhoneNumber(mobile.value);
    if (!normalizedMobile) {
      showFieldError(mobile, "Please enter a valid 10-digit Indian mobile number.");
      valid = false;
    } else {
      mobile.value = normalizedMobile.nationalNumber;
      clearFieldError(mobile);
    }
  } else if (step === 2) {
    check("pincode", "Please enter a valid 6-digit PIN code.", /^\d{6}$/);
    check("state", "Please enter state.");
    check("district", "Please enter district.");
    check("tehsil", "Please enter tehsil/taluka.");
    check("village", "Please enter village/city.");
    check("address", "Please enter your complete address.");
  } else if (step === 3) {
    const category = getSignupElement("user-category");
    if (!category.value) {
      showFieldError(category, "Please select a category.");
      valid = false;
    } else {
      clearFieldError(category);
    }
    const language = signupCard.querySelector('input[name="preferred-language"]:checked');
    if (!language) {
      showFieldError(signupCard.querySelector('input[name="preferred-language"]'), "Please select a preferred language.");
      valid = false;
    } else {
      clearFieldError(language);
    }
  }
  return valid;
}

function goToStep(step) {
  currentStep = step;
  form.dataset.step = String(step);
  signupCard.querySelectorAll(".signup-step").forEach((element, index) => {
    element.classList.toggle("active", index + 1 === step);
    element.classList.toggle("completed", index + 1 < step);
  });
  const activeLine = getSignupElement("step-line-active");
  activeLine.style.width = `${((step - 1) / 3) * 100}%`;
  signupCard.querySelectorAll(".signup-step-content").forEach((element) => {
    element.classList.toggle("active", element.id === `step-${step}-content`);
  });

  const titles = {
    1: ["Personal Details", "Tell us about yourself."],
    2: ["Location Details", "Where do you live? We'll auto-fill from your PIN code."],
    3: ["Category & Language", "Help us personalize SarthiX for you."],
    4: ["Verify Mobile", "Confirm your identity with an OTP."]
  };
  getSignupElement("signup-title").textContent = titles[step][0];
  getSignupElement("signup-sub").textContent = titles[step][1];
  const previousButton = getSignupElement("prev-btn");
  previousButton.style.display = step === 1 ? "none" : "inline-flex";
  previousButton.disabled = step === 1;
  nextText.textContent = step === 4 ? "Create Account" : "Next";
  const scrollPanel = signupCard.closest(".login-right");
  if (scrollPanel && scrollPanel.scrollHeight > scrollPanel.clientHeight) {
    scrollPanel.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function collectProfile() {
  return {
    fullName: getSignupElement("full-name").value.trim(),
    dob: getSignupElement("dob").value,
    gender: signupCard.querySelector('input[name="gender"]:checked')?.value || null,
    pincode: getSignupElement("pincode").value.trim(),
    state: getSignupElement("state").value.trim(),
    district: getSignupElement("district").value.trim(),
    postOffice: getSignupElement("post-office").value || null,
    tehsil: getSignupElement("tehsil").value.trim(),
    village: getSignupElement("village").value.trim(),
    gramPanchayat: getSignupElement("gram-panchayat").value.trim() || null,
    address: getSignupElement("address").value.trim(),
    userCategory: getSignupElement("user-category").value,
    preferredLanguage: signupCard.querySelector('input[name="preferred-language"]:checked').value
  };
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
  const countdown = resendButton.querySelector(".resend-countdown");
  countdown.textContent = `(${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")})`;
}

async function sendCode(isResend = false) {
  if (otpRequestPending) return;
  if (!validIndianMobile(otpMobile.value)) {
    showFieldError(otpMobile, "Please enter a valid 10-digit Indian mobile number.");
    return;
  }
  if (!isFirebaseConfigured) {
    showToast("Add your Firebase Web App values to firebase-config.js first.", "error");
    return;
  }

  const button = isResend ? resendButton : sendOtpButton;
  const textElement = button.querySelector(".resend-text") || button;
  const loaderElement = button.querySelector(".loader") || document.createElement("span");
  const originalLabel = isResend ? "Resend OTP" : "Send OTP";
  const normalizedPhone = normalizeIndianPhoneNumber(otpMobile.value);
  if (!normalizedPhone) {
    showFieldError(otpMobile, "Please enter a valid Indian mobile number, with or without +91.");
    return;
  }
  otpMobile.value = normalizedPhone.nationalNumber;
  const phoneNumber = normalizedPhone.e164;
  otpRequestPending = true;
  setButtonLoading(button, true, textElement, loaderElement, isResend ? "Resending…" : "Sending OTP…");
  try {
    await setPersistence(auth, browserLocalPersistence);
    resetRecaptcha();
    await recaptchaVerifier.render();
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    pendingPhoneNumber = phoneNumber;
    otpInputGroup.style.display = "block";
    sendOtpButton.hidden = true;
    resendButton.hidden = false;
    startCountdown();
    showToast(isFirebaseAuthEmulator()
      ? "Test code requested. No SMS is sent in the local emulator; use the code shown in its terminal."
      : isResend ? "OTP resent." : "OTP sent. Enter the 6-digit code from your SMS.");
    otpCode.focus();
  } catch (error) {
    console.error("Firebase phone signup request failed.", error);
    clearRecaptcha();
    showToast(friendlyAuthError(error), "error");
  } finally {
    otpRequestPending = false;
    setButtonLoading(button, false, textElement, loaderElement, originalLabel);
    if (isResend && countdownTimer) resendButton.disabled = true;
  }
}

function isFirebaseAuthEmulator() {
  return new URLSearchParams(window.location.search).get("firebaseAuthEmulator") === "true";
}

async function verifyAndSaveProfile() {
  const code = otpCode.value.trim();
  if (!/^\d{6}$/.test(code)) {
    showFieldError(otpCode, "Please enter the 6-digit OTP.");
    return;
  }

  setButtonLoading(nextButton, true, nextText, nextLoader, "Verifying…");
  try {
    if (confirmationResult && `+91${otpMobile.value.trim()}` !== pendingPhoneNumber) {
      confirmationResult = null;
      pendingPhoneNumber = null;
      showToast("The mobile number changed. Send a new OTP for this number.", "error");
      return;
    }
    if (!verifiedUser) {
      if (!confirmationResult) {
        showToast("Send an OTP first, then enter the code.", "error");
        return;
      }
      otpFlowStarted = true;
      window.SarthiXAuthState.registrationInProgress = true;
      const credential = await confirmationResult.confirm(code);
      if (credential.user.phoneNumber !== pendingPhoneNumber) {
        await signOut(auth);
        confirmationResult = null;
        pendingPhoneNumber = null;
        otpFlowStarted = false;
        window.SarthiXAuthState.registrationInProgress = false;
        const error = new Error("The verified phone number did not match the number used to request the OTP.");
        error.kind = "phone-mismatch";
        throw error;
      }
      verifiedUser = credential.user;
      await verifiedUser.getIdToken(true);
    }

    await establishAuthSession();
    await requestOwnProfile("POST", profileDraft);
    try {
      localStorage.setItem("sarthix-language", profileDraft.preferredLanguage === "en" ? "en-IN" : "hi-IN");
      localStorage.removeItem("sarthix-language-user-selected");
    } catch (error) {
      console.error("Could not save the signup language preference locally.", error);
    }

    window.clearInterval(countdownTimer);
    otpInputGroup.style.display = "none";
    otpSendGroup.style.display = "none";
    otpSuccess.style.display = "block";
    getSignupElement("signup-nav").style.display = "none";
    showToast("Account created successfully.");
    redirecting = true;
    window.setTimeout(() => window.location.replace("index.html"), 1200);
  } catch (error) {
    console.error("Phone signup verification or profile save failed.", error);
    if (error.kind === "profile-api" && error.status === 409) {
      await signOut(auth);
      verifiedUser = null;
      confirmationResult = null;
      otpFlowStarted = false;
      window.SarthiXAuthState.registrationInProgress = false;
      showToast("An account already exists for this number. Please sign in instead.", "error");
      return;
    }
    if (error.kind === "phone-mismatch") {
      showToast(error.message, "error");
      return;
    }
    const otpError = getSignupElement("otp-verify-error");
    if (error.code === "auth/invalid-verification-code" || error.code === "auth/code-expired") {
      otpError.textContent = friendlyAuthError(error);
      otpError.classList.add("visible");
    } else {
      showToast(friendlyAuthError(error), "error");
    }
  } finally {
    setButtonLoading(nextButton, false, nextText, nextLoader, "Create Account");
  }
}

getSignupElement("prev-btn").addEventListener("click", () => {
  if (currentStep > 1 && currentStep < 4) goToStep(currentStep - 1);
});

nextButton.addEventListener("click", async () => {
  if (currentStep < 4) {
    if (!validateStep(currentStep)) return;
    if (currentStep === 3) {
      profileDraft = collectProfile();
      otpMobile.value = getSignupElement("mobile").value.trim();
      otpSendGroup.style.display = "block";
    }
    goToStep(currentStep + 1);
    return;
  }
  await verifyAndSaveProfile();
});

sendOtpButton.addEventListener("click", () => sendCode(false));
resendButton.addEventListener("click", () => {
  if (!resendButton.disabled) sendCode(true);
});

signupCard.querySelectorAll(".form-input, textarea, select").forEach((input) => {
  input.addEventListener("input", () => clearFieldError(input));
  input.addEventListener("change", () => clearFieldError(input));
});
otpMobile.addEventListener("input", () => clearFieldError(otpMobile));
otpCode.addEventListener("input", () => {
  clearFieldError(otpCode);
  getSignupElement("otp-verify-error").classList.remove("visible");
});

const pincode = getSignupElement("pincode");
const pincodeStatus = getSignupElement("pincode-status");
let pincodeTimeout = null;

pincode.addEventListener("input", () => {
  const value = pincode.value.replace(/\D/g, "");
  pincode.value = value;
  window.clearTimeout(pincodeTimeout);
  pincodeStatus.textContent = "";
  if (value.length === 6) pincodeTimeout = window.setTimeout(() => lookupPincode(value), 400);
});

async function lookupPincode(code) {
  pincodeStatus.textContent = "Looking up PIN code…";
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(code)}`);
    if (!response.ok) throw new Error("PIN code lookup failed.");
    const data = await response.json();
    const info = Array.isArray(data) ? data[0] : data;
    if (!info || info.Status !== "Success" || !info.PostOffice?.length) {
      pincodeStatus.textContent = "Invalid PIN code or no data found. Please enter details manually.";
      pincodeStatus.className = "pin-status error";
      return;
    }
    const postOffices = info.PostOffice;
    getSignupElement("state").value = postOffices[0].State || "";
    getSignupElement("district").value = postOffices[0].District || "";
    const select = getSignupElement("post-office");
    select.replaceChildren(new Option("Select post office", ""));
    postOffices.forEach((office) => {
      const option = new Option(office.Name, office.Name);
      option.dataset.taluk = office.Taluk || "";
      select.add(option);
    });
    pincodeStatus.textContent = `Found ${postOffices.length} post office(s).`;
    pincodeStatus.className = "pin-status";
  } catch (error) {
    console.error("PIN code lookup failed.", error);
    pincodeStatus.textContent = "Could not look up PIN code. Please enter details manually.";
    pincodeStatus.className = "pin-status error";
  }
}

getSignupElement("post-office").addEventListener("change", (event) => {
  const option = event.target.selectedOptions[0];
  if (!option || !option.value) return;
  if (option.dataset.taluk) getSignupElement("tehsil").value = option.dataset.taluk;
  getSignupElement("village").value = option.value;
});

signupCard.querySelectorAll('input[name="preferred-language"], input[name="gender"]').forEach((input) => {
  input.addEventListener("change", () => {
    signupCard.querySelectorAll(`input[name="${input.name}"]`).forEach((item) => {
      item.closest(".lang-chip").classList.toggle("is-selected", item.checked);
    });
    clearFieldError(input);
  });
});

form.addEventListener("submit", (event) => event.preventDefault());
goToStep(1);
