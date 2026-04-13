import { s as ssr_context, e as escape_html, b as attr, d as derived } from "../../../../chunks/root.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
import { p as page } from "../../../../chunks/index2.js";
import { P as PUBLIC_API_URL, s as socketStore } from "../../../../chunks/presence.svelte.js";
import { s as sessionStore } from "../../../../chunks/session.svelte.js";
import "../../../../chunks/Avatar.svelte_svelte_type_style_lang.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
async function request(path, options = {}) {
  const token = sessionStore.accessToken;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    ...options,
    headers
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json();
}
const chats = {
  list: () => request("/api/v1/chats"),
  createDm: (memberId) => request("/api/v1/chats/dm", {
    method: "POST",
    body: JSON.stringify({ memberId })
  }),
  messages: (chatId, params) => {
    const qs = new URLSearchParams();
    if (params?.before) qs.set("before", params.before);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs}` : "";
    return request(`/api/v1/chats/${chatId}/messages${query}`);
  },
  send: (chatId, body) => request(`/api/v1/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify(body)
  }),
  markRead: (chatId, throughMessageId) => request(`/api/v1/chats/${chatId}/read`, {
    method: "POST",
    body: JSON.stringify(throughMessageId ? { throughMessageId } : {})
  }),
  getPreferences: (chatId) => request(`/api/v1/chats/${chatId}/preferences`),
  setPreferences: (chatId, body) => request(`/api/v1/chats/${chatId}/preferences`, {
    method: "POST",
    body: JSON.stringify(body)
  })
};
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const chatId = derived(() => page.params.id ?? "");
    const connectionStatus = derived(() => socketStore.state);
    const statusDot = derived(() => {
      switch (connectionStatus()) {
        case "connected":
          return "🟢";
        case "connecting":
          return "🟡";
        case "degraded":
          return "🟡";
        case "failed":
          return "🔴";
        default:
          return "⚪";
      }
    });
    let chatName = "";
    let inputText = "";
    let sending = false;
    let typingUserIds = /* @__PURE__ */ new Set();
    function getTypingLabel() {
      if (typingUserIds.size === 0) return "";
      if (typingUserIds.size === 1) {
        return "Someone is typing...";
      }
      return `${typingUserIds.size} people are typing...`;
    }
    onDestroy(() => {
      chats.markRead(chatId()).catch(() => {
      });
    });
    $$renderer2.push(`<div class="thread-shell svelte-gz601r"><header class="thread-header svelte-gz601r"><button class="back-btn svelte-gz601r" aria-label="Back to chat list">←</button> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="header-content svelte-gz601r"><h2 class="thread-name svelte-gz601r">${escape_html(chatName)}</h2> `);
    if (typingUserIds.size > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="typing-indicator svelte-gz601r">${escape_html(getTypingLabel())}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="connection-status svelte-gz601r"><span class="status-dot svelte-gz601r">${escape_html(statusDot())}</span></div></header> <div class="messages-scroll svelte-gz601r">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-gz601r">Loading...</div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="composer svelte-gz601r"><textarea class="composer-input svelte-gz601r" placeholder="Message..."${attr("disabled", sending, true)} rows="1">`);
    const $$body = escape_html(inputText);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> <button class="composer-btn gif-btn svelte-gz601r"${attr("disabled", sending, true)} aria-label="Send a GIF" title="GIF">🎬</button> <button class="send-btn svelte-gz601r"${attr("disabled", !inputText.trim() || sending, true)} aria-label="Send message">↑</button></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
