import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth } from "../firebase-config.js";
import { expireLocalAuthSession } from "./auth-session.js";

const API_BASE_URL = String(
  window.SARTHIX_CONFIG?.apiBaseUrl || "http://localhost:5000/api"
).replace(/\/+$/, "");

let conversationId = null;
let authRevision = 0;

async function request(path, { method = "GET", body, history = [] } = {}) {
  const headers = {};
  const user = auth.currentUser;
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  if (body) headers["Content-Type"] = "application/json";

  const payload = body
    ? { ...body, ...(conversationId ? { conversationId } : {}) }
    : undefined;
  let response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      signal: controller.signal
    });
  } catch (cause) {
    const error = new Error("We could not reach the chat service. Check your connection and try again.");
    error.kind = "network";
    error.cause = cause;
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  const returnedConversationId = response.headers.get("X-Chat-Conversation-Id");
  if (returnedConversationId && /^\d+$/.test(returnedConversationId)) {
    conversationId = Number(returnedConversationId);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error("The chat service returned an invalid response.");
    error.kind = "invalid-response";
    throw error;
  }
  if (!response.ok || data?.success !== true) {
    if (response.status === 401) await expireLocalAuthSession();
    const error = new Error("chat-api");
    error.kind = "api";
    error.status = response.status;
    error.message = data?.message || error.message;
    throw error;
  }
  if (data.conversationId) conversationId = data.conversationId;
  return data;
}

export async function sendChatMessage({ message, history, profileContext }) {
  return request("/chat", {
    method: "POST",
    history,
    body: { message, history, profileContext }
  });
}

export async function loadChatHistory() {
  if (!auth.currentUser) {
    conversationId = null;
    return { conversationId: null, profileContext: {}, messages: [] };
  }
  const result = await request("/chat/history");
  return result;
}

export async function loadSavedConversations() {
  if (!auth.currentUser) {
    throw new Error("Sign in to view saved conversations.");
  }
  return request("/chat/conversations");
}

export async function loadConversation(id) {
  if (!auth.currentUser) {
    throw new Error("Sign in to open a saved conversation.");
  }
  const result = await request(`/chat/conversations/${encodeURIComponent(id)}`);
  conversationId = result.conversationId;
  return result;
}

export async function deleteConversation(id) {
  if (!auth.currentUser) {
    throw new Error("Sign in to delete a saved conversation.");
  }
  await request(`/chat/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (Number(id) === conversationId) conversationId = null;
}

export function startNewConversation() {
  conversationId = null;
}

window.SarthiXChatApi = {
  sendMessage: sendChatMessage,
  loadHistory: loadChatHistory,
  loadConversations: loadSavedConversations,
  loadConversation,
  deleteConversation,
  startNewConversation
};

onAuthStateChanged(auth, async (user) => {
  const revision = ++authRevision;
  conversationId = null;
  window.dispatchEvent(new CustomEvent("sarthix:chat-auth-state", {
    detail: { signedIn: Boolean(user) }
  }));
  if (!user) {
    window.dispatchEvent(new CustomEvent("sarthix:chat-history", {
      detail: { conversationId: null, profileContext: {}, messages: [] }
    }));
    return;
  }
  try {
    const history = await loadChatHistory();
    if (revision !== authRevision) return;
    window.dispatchEvent(new CustomEvent("sarthix:chat-history", { detail: history }));
  } catch (error) {
    if (revision !== authRevision) return;
    console.error("Could not load the signed-in user's chat history.", error);
    window.dispatchEvent(new CustomEvent("sarthix:chat-history-error", { detail: { message: error.message } }));
  }
});
