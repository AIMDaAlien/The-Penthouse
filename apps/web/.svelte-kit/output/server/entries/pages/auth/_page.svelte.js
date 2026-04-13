import { a as attr_class, b as attr, e as escape_html } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import "../../../chunks/session.svelte.js";
import "socket.io-client";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let mode = "login";
    let username = "";
    let password = "";
    let loading = false;
    $$renderer2.push(`<div class="auth-shell svelte-1s728sz"><div class="auth-hero svelte-1s728sz"><div class="logo svelte-1s728sz"><span class="logo-the svelte-1s728sz">The</span> <span class="logo-pent svelte-1s728sz">PENT</span> <span class="logo-house svelte-1s728sz">HOUSE</span></div> <p class="tagline svelte-1s728sz">As dynamic as your personality.</p></div> <div class="auth-card svelte-1s728sz"><div class="mode-tabs svelte-1s728sz"><button${attr_class("tab svelte-1s728sz", void 0, { "active": mode === "login" })}>Sign in</button> <button${attr_class("tab svelte-1s728sz", void 0, { "active": mode === "register" })}>Create account</button></div> <form class="svelte-1s728sz"><div class="field svelte-1s728sz"><label for="username" class="svelte-1s728sz">Username</label> <input id="username" type="text"${attr("value", username)}${attr("autocomplete", "username")} autocapitalize="none" required=""${attr("disabled", loading, true)} class="svelte-1s728sz"/></div> <div class="field svelte-1s728sz"><label for="password" class="svelte-1s728sz">Password</label> <input id="password" type="password"${attr("value", password)}${attr("autocomplete", "current-password")} required=""${attr("disabled", loading, true)} class="svelte-1s728sz"/></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button type="submit" class="submit-btn svelte-1s728sz"${attr("disabled", loading, true)}>${escape_html("Sign in")}</button></form></div></div>`);
  });
}
export {
  _page as default
};
