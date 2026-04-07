import { a as attr, e as escape_html, c as ensure_array_like, b as attr_class } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import "../../../chunks/session.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let searchQuery = "";
    let allUsers = [];
    let loading = false;
    let offset = 0;
    let limit = 20;
    let total = 0;
    function getStatusColor(lastSeenAt) {
      if (!lastSeenAt) return "offline";
      const now = /* @__PURE__ */ new Date();
      const lastSeen = new Date(lastSeenAt);
      const diffMs = now.getTime() - lastSeen.getTime();
      const diffMins = diffMs / (1e3 * 60);
      return diffMins < 5 ? "online" : "away";
    }
    function formatLastSeen(lastSeenAt) {
      if (!lastSeenAt) return "Never";
      const date = new Date(lastSeenAt);
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1e3 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    }
    $$renderer2.push(`<div class="users-shell svelte-9fk07v"><header class="users-header svelte-9fk07v"><button class="back-btn svelte-9fk07v" aria-label="Back to chat list">←</button> <h1 class="users-title svelte-9fk07v">Find People</h1></header> <div class="search-container svelte-9fk07v"><input type="text" class="search-input svelte-9fk07v" placeholder="Search by username or name..."${attr("value", searchQuery)}${attr("disabled", loading, true)}/> <button class="search-btn svelte-9fk07v"${attr("disabled", !searchQuery.trim(), true)} aria-label="Search users">🔍</button></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="users-list svelte-9fk07v">`);
    {
      $$renderer2.push("<!--[-1-->");
      if (allUsers.length === 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="state-msg svelte-9fk07v">No users found</div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="results-header svelte-9fk07v">Showing ${escape_html(offset + 1)}–${escape_html(Math.min(offset + limit, total))} of ${escape_html(total)} user${escape_html("s")}</div> <!--[-->`);
        const each_array_1 = ensure_array_like(allUsers);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let user = each_array_1[$$index_1];
          $$renderer2.push(`<button class="user-card svelte-9fk07v"><div class="user-avatar svelte-9fk07v">`);
          if (user.avatarUrl) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<img${attr("src", user.avatarUrl)}${attr("alt", user.displayName)} class="svelte-9fk07v"/>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<div class="avatar-placeholder svelte-9fk07v">${escape_html(user.displayName.charAt(0).toUpperCase())}</div>`);
          }
          $$renderer2.push(`<!--]--> <div${attr_class("status-dot svelte-9fk07v", void 0, {
            "online": getStatusColor(user.lastSeenAt) === "online",
            "away": getStatusColor(user.lastSeenAt) === "away",
            "offline": getStatusColor(user.lastSeenAt) === "offline"
          })}></div></div> <div class="user-info svelte-9fk07v"><div class="user-name svelte-9fk07v">${escape_html(user.displayName)}</div> <div class="user-meta svelte-9fk07v">@${escape_html(user.username)}</div> <div class="user-last-seen svelte-9fk07v">`);
          if (getStatusColor(user.lastSeenAt) === "online") {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="status-label online svelte-9fk07v">Online</span>`);
          } else if (getStatusColor(user.lastSeenAt) === "away") {
            $$renderer2.push("<!--[1-->");
            $$renderer2.push(`<span class="status-label away svelte-9fk07v">Away</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<span class="status-label offline svelte-9fk07v">Seen ${escape_html(formatLastSeen(user.lastSeenAt))}</span>`);
          }
          $$renderer2.push(`<!--]--></div></div> <div class="chevron svelte-9fk07v">→</div></button>`);
        }
        $$renderer2.push(`<!--]--> <div class="pagination svelte-9fk07v"><button class="pagination-btn svelte-9fk07v"${attr("disabled", offset === 0, true)}>← Previous</button> <span class="pagination-info svelte-9fk07v">Page ${escape_html(Math.floor(offset / limit) + 1)}</span> <button class="pagination-btn svelte-9fk07v"${attr("disabled", offset + limit >= total, true)}>Next →</button></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _page as default
};
