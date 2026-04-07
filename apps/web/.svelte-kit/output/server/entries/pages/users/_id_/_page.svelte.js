import { d as derived } from "../../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
import { p as page } from "../../../../chunks/index2.js";
import { s as sessionStore } from "../../../../chunks/session.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const userId = derived(() => page.params.id ?? "");
    const isOwnProfile = derived(() => sessionStore.current?.user.id === userId());
    $$renderer2.push(`<div class="profile-shell svelte-xnw5yb"><header class="profile-header svelte-xnw5yb"><button class="back-btn svelte-xnw5yb" aria-label="Back to users">←</button> <h1 class="profile-title svelte-xnw5yb">Profile</h1> `);
    if (isOwnProfile() && true) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="edit-btn svelte-xnw5yb" aria-label="Edit profile">✎</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></header> <div class="profile-content svelte-xnw5yb">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-msg svelte-xnw5yb">Loading profile...</div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _page as default
};
