import { e as escape_html, d as derived } from "../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import { s as sessionStore } from "../../chunks/session.svelte.js";
import { s as socketStore } from "../../chunks/presence.svelte.js";
import "../../chunks/Avatar.svelte_svelte_type_style_lang.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    sessionStore.current?.user.id ?? "";
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
    $$renderer2.push(`<div class="shell svelte-1uha8ag"><header class="app-header svelte-1uha8ag"><h1 class="app-title svelte-1uha8ag">The Penthouse</h1> <div class="header-actions svelte-1uha8ag"><div class="connection-status svelte-1uha8ag"><span class="status-dot svelte-1uha8ag">${escape_html(statusDot())}</span></div> <button class="action-btn svelte-1uha8ag" aria-label="New message" title="Start a new conversation">✏️</button> <button class="action-btn svelte-1uha8ag" aria-label="Find people">👥</button> <button class="logout-btn svelte-1uha8ag">Sign out</button></div></header> <main class="chat-list svelte-1uha8ag">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-1uha8ag">Loading...</div>`);
    }
    $$renderer2.push(`<!--]--></main> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
