import { h as head } from "../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import "../../chunks/client.js";
import "../../chunks/session.svelte.js";
import "socket.io-client";
import "../../chunks/presence.svelte.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.push(`<meta name="theme-color" content="#12121C"/> <link rel="manifest" href="/manifest.webmanifest"/>`);
    });
    children($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
export {
  _layout as default
};
