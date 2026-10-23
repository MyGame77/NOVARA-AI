
const API_URL = "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE";

const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messageList = document.getElementById("messageList");
const sendButton = document.getElementById("sendButton");
const welcome = document.getElementById("welcome");

let chatHistory = [];

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "YOU" : "NOVARA AI";

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;

  message.append(label, content);
  messageList.appendChild(message);
  messageList.scrollTop = messageList.scrollHeight;
}

async function sendMessage(text) {
  text = text.trim();
  if (!text || sendButton.disabled) return;

  if (API_URL.includes("PASTE_YOUR")) {
    alert("Bro, add your Cloudflare Worker URL in app.js first!");
    return;
  }

  welcome?.classList.add("hidden");
  addMessage("user", text);
  chatHistory.push({ role: "user", text });

  input.value = "";
  sendButton.disabled = true;

  const loading = document.createElement("div");
  loading.className = "message assistant";
  loading.textContent = "NOVARA AI is thinking...";
  messageList.appendChild(loading);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    const reply = data.reply || "I couldn't generate a reply.";
    loading.remove();
    addMessage("assistant", reply);
    chatHistory.push({ role: "assistant", text: reply });
  } catch (error) {
    loading.remove();
    addMessage(
      "assistant",
      `Connection error: ${error.message}. Check your Worker URL and Cloudflare settings.`
    );
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

form?.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

document.getElementById("newChatButton")?.addEventListener("click", () => {
  chatHistory = [];
  messageList.replaceChildren();
  welcome?.classList.remove("hidden");
  input.value = "";
});

document.getElementById("clearChatButton")?.addEventListener("click", () => {
  chatHistory = [];
  messageList.replaceChildren();
  welcome?.classList.remove("hidden");
});

document.getElementById("openSidebar")?.addEventListener("click", () => {
  document.getElementById("sidebar")?.classList.add("open");
  document.getElementById("sidebarBackdrop")?.classList.add("visible");
});

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarBackdrop")?.classList.remove("visible");
}

document.getElementById("closeSidebar")?.addEventListener("click", closeSidebar);
document.getElementById("sidebarBackdrop")?.addEventListener("click", closeSidebar);

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    const chatView = document.getElementById("chatView");
    const placeholder = document.getElementById("placeholderView");

    document.querySelectorAll("[data-view]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    if (view === "chat") {
      chatView?.classList.remove("hidden");
      placeholder?.classList.add("hidden");
    } else {
      chatView?.classList.add("hidden");
      placeholder?.classList.remove("hidden");

      const titles = {
        history: "Chat History",
        tools: "AI Tools",
        settings: "Settings"
      };

      document.getElementById("placeholderTitle").textContent =
        titles[view] || "Coming Soon";

      document.getElementById("placeholderText").textContent =
        view === "history"
          ? "Your previous conversations will appear here in a future update."
          : view === "tools"
          ? "More AI tools are coming soon."
          : "NOVARA AI settings will be available in a future update.";
    }

    closeSidebar();
  });
});

document.getElementById("backToChatButton")?.addEventListener("click", () => {
  document.querySelector('[data-view="chat"]')?.click();
});
