import { auth } from "../firebase-config.js";
import { expireLocalAuthSession } from "./auth-session.js";

const API_BASE_URL = String(
  window.SARTHIX_CONFIG?.apiBaseUrl || "http://localhost:5000/api"
).replace(/\/+$/, "");

export async function requestOwnProfile(method = "GET", profile) {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error("Please sign in again to access your profile.");
    error.kind = "profile-api";
    error.status = 401;
    throw error;
  }

  let token;
  let response;
  try {
    token = await user.getIdToken();
    response = await fetch(`${API_BASE_URL}/users/profile`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(profile ? { "Content-Type": "application/json" } : {})
      },
      ...(profile ? { body: JSON.stringify({ profile }) } : {})
    });
  } catch (cause) {
    const error = new Error("We could not reach the profile service. Check your connection and try again.");
    error.kind = "profile-api";
    error.status = 0;
    error.cause = cause;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error("The profile service returned an invalid response.");
    error.kind = "profile-api";
    error.status = response.status;
    throw error;
  }

  if (!response.ok || data?.success !== true) {
    if (response.status === 401) await expireLocalAuthSession();
    const error = new Error(data?.message || "We could not save or load your profile.");
    error.kind = "profile-api";
    error.status = response.status;
    throw error;
  }
  return data.profile;
}

export async function establishAuthSession() {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error("Please verify your phone number before continuing.");
    error.kind = "profile-api";
    error.status = 401;
    throw error;
  }

  let response;
  try {
    const token = await user.getIdToken(true);
    response = await fetch(`${API_BASE_URL}/auth/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (cause) {
    const error = new Error("Phone verification succeeded, but we could not connect to the account service.");
    error.kind = "profile-api";
    error.status = 0;
    error.cause = cause;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error("The account service returned an invalid response.");
    error.kind = "profile-api";
    error.status = response.status;
    throw error;
  }
  if (!response.ok || data?.success !== true || data?.authenticated !== true || !data?.user?.id) {
    if (response.status === 401) await expireLocalAuthSession();
    const error = new Error(data?.message || "We could not establish your account session.");
    error.kind = "profile-api";
    error.status = response.status;
    throw error;
  }
  return data.user;
}

export async function recordOwnLogin() {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error("Please sign in again to record this login.");
    error.kind = "profile-api";
    error.status = 401;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await user.getIdToken()}` }
    });
  } catch (cause) {
    const error = new Error("We could not record your login in the account database.");
    error.kind = "profile-api";
    error.status = 0;
    error.cause = cause;
    throw error;
  }

  const data = await response.json();
  if (!response.ok || data?.success !== true) {
    if (response.status === 401) await expireLocalAuthSession();
    const error = new Error(data?.message || "We could not record your login.");
    error.kind = "profile-api";
    error.status = response.status;
    throw error;
  }
  return data.login;
}
