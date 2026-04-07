import { h as head, a as attr, e as escape_html, d as derived } from "../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import "../../chunks/client.js";
import { s as sessionStore } from "../../chunks/session.svelte.js";
import "clsx";
import { io } from "socket.io-client";
import { P as PUBLIC_SOCKET_URL } from "../../chunks/public.js";
function createSocketStore() {
  let socket = null;
  let state = "idle";
  function connect(accessToken) {
    if (socket?.connected) return;
    state = "connecting";
    const s = io(PUBLIC_SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1e3,
      reconnectionDelayMax: 15e3
    });
    s.on("connect", () => {
      state = "connected";
    });
    s.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        state = "failed";
      } else {
        state = "degraded";
      }
    });
    s.on("connect_error", () => {
      state = "degraded";
    });
    socket = s;
  }
  function disconnect() {
    socket?.disconnect();
    socket = null;
    state = "idle";
  }
  return {
    get instance() {
      return socket;
    },
    get state() {
      return state;
    },
    get isConnected() {
      return state === "connected";
    },
    connect,
    disconnect
  };
}
const socketStore = createSocketStore();
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    const connectionStatus = derived(() => socketStore.state);
    const statusLabel = derived(() => {
      switch (connectionStatus()) {
        case "connected":
          return "Connected";
        case "connecting":
          return "Connecting...";
        case "degraded":
          return "Reconnecting...";
        case "failed":
          return "Offline";
        case "idle":
          return "Idle";
        default:
          return "Unknown";
      }
    });
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
        case "idle":
          return "⚪";
        default:
          return "⚪";
      }
    });
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.push(`<meta name="theme-color" content="#12121C" class="svelte-12qhfyh"/> <link rel="manifest" href="/manifest.webmanifest" class="svelte-12qhfyh"/>`);
    });
    children($$renderer2);
    $$renderer2.push(`<!----> `);
    if (sessionStore.isAuthenticated) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="connection-indicator svelte-12qhfyh"${attr("title", statusLabel())}${attr("aria-label", `Connection status: ${statusLabel()}`)}><span class="status-dot svelte-12qhfyh">${escape_html(statusDot())}</span> <span class="status-text svelte-12qhfyh">${escape_html(statusLabel())}</span></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _layout as default
};
