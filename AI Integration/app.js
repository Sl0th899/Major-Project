const API_BASE_URL = "http://127.0.0.1:8000";

let providerKey = "";
let sessionId = "";
let conversationId = "";

const keyScreen = document.querySelector("#key-screen");
const chatScreen = document.querySelector("#chat-screen");
const keyForm = document.querySelector("#key-form");
const keyInput = document.querySelector("#api-key");
const keyStatus = document.querySelector("#key-status");
const chatForm = document.querySelector("#chat-form");
const messageInput = document.querySelector("#message");
const chatStatus = document.querySelector("#chat-status");
const messages = document.querySelector("#messages");
const endSession = document.querySelector("#end-session");

function providerHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Provider-API-Key": providerKey,
  };
}

function sessionHeaders() {
  return {
    ...providerHeaders(),
    "X-Anonymous-Session": sessionId,
  };
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function addMessage(role, content) {
  const item = document.createElement("article");
  item.className = `message ${role}`;
  const label = document.createElement("span");
  label.className = "message-role";
  label.textContent = role === "user" ? "You" : "Cat Therapist";
  const body = document.createElement("p");
  body.textContent = content;
  item.append(label, body);
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

async function readError(response, fallback) {
  try {
    const body = await response.json();
    return body.detail?.message || fallback;
  } catch {
    return fallback;
  }
}

async function startSession(event) {
  event.preventDefault();
  const enteredKey = keyInput.value.trim();
  if (!enteredKey) {
    setStatus(keyStatus, "Enter an API key to continue.", true);
    return;
  }

  keyForm.querySelector("button").disabled = true;
  setStatus(keyStatus, "Checking your key...");
  try {
    const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
      method: "POST",
      headers: {
        "X-Provider-API-Key": enteredKey,
      },
    });
    if (!response.ok) {
      throw new Error(await readError(response, "That key could not be used."));
    }
    const session = await response.json();
    providerKey = enteredKey;
    sessionId = session.session_id;
    keyInput.value = "";
    keyScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    messageInput.focus();
  } catch (error) {
    setStatus(keyStatus, error.message || "The provider could not be reached.", true);
  } finally {
    keyForm.querySelector("button").disabled = false;
  }
}

async function sendMessage(event) {
  event.preventDefault();
  const content = messageInput.value.trim();
  if (!content || !sessionId) return;

  chatForm.querySelector("button").disabled = true;
  setStatus(chatStatus, "Thinking...");
  try {
    if (!conversationId) {
      const conversationResponse = await fetch(`${API_BASE_URL}/conversations`, {
        method: "POST",
        headers: { "X-Anonymous-Session": sessionId },
        body: JSON.stringify({}),
      });
      if (!conversationResponse.ok) {
        throw new Error(await readError(conversationResponse, "The anonymous session has expired."));
      }
      conversationId = (await conversationResponse.json()).id;
    }

    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: sessionHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error(await readError(response, "The AI provider could not respond."));
    }
    const result = await response.json();
    addMessage("user", result.user_message.content);
    addMessage("assistant", result.assistant_message.content);
    messageInput.value = "";
    setStatus(chatStatus, "");
  } catch (error) {
    setStatus(chatStatus, error.message || "The message could not be sent.", true);
  } finally {
    chatForm.querySelector("button").disabled = false;
    messageInput.focus();
  }
}

async function clearSession() {
  if (sessionId) {
    await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, { method: "DELETE" }).catch(() => {});
  }
  providerKey = "";
  sessionId = "";
  conversationId = "";
  messages.replaceChildren();
  chatScreen.classList.add("hidden");
  keyScreen.classList.remove("hidden");
  setStatus(keyStatus, "");
  keyInput.focus();
}

keyForm.addEventListener("submit", startSession);
chatForm.addEventListener("submit", sendMessage);
endSession.addEventListener("click", clearSession);
window.addEventListener("pagehide", () => {
  providerKey = "";
  sessionId = "";
  conversationId = "";
});
