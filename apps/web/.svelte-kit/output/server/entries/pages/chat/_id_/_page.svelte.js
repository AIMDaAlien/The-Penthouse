import { s as ssr_context, e as escape_html, a as attr, d as derived } from "../../../../chunks/root.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
import { p as page } from "../../../../chunks/index2.js";
import { a as PUBLIC_API_URL } from "../../../../chunks/public.js";
import { s as sessionStore } from "../../../../chunks/session.svelte.js";
import "socket.io-client";
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
  markRead: (chatId) => request(`/api/v1/chats/${chatId}/read`, { method: "POST" })
};
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const chatId = derived(() => page.params.id ?? "");
    let chatName = "";
    let inputText = "";
    let sending = false;
    onDestroy(() => {
      chats.markRead(chatId()).catch(() => {
      });
    });
    $$renderer2.push(`<div class="thread-shell svelte-gz601r"><header class="thread-header svelte-gz601r"><button class="back-btn svelte-gz601r" aria-label="Back to chat list">←</button> <h2 class="thread-name svelte-gz601r">${escape_html(chatName)}</h2></header> <div class="messages-scroll svelte-gz601r">`);
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
    $$renderer2.push(`</textarea> <button class="send-btn svelte-gz601r"${attr("disabled", !inputText.trim() || sending, true)} aria-label="Send message">↑</button></div></div>`);
  });
}
export {
  _page as default
};
