import "clsx";
function createSessionStore() {
  let session = loadPersistedSession();
  function loadPersistedSession() {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("penthouse_session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function set(value) {
    session = value;
    if (typeof window === "undefined") return;
    if (value) {
      sessionStorage.setItem("penthouse_session", JSON.stringify(value));
    } else {
      sessionStorage.removeItem("penthouse_session");
    }
  }
  function clear() {
    set(null);
  }
  return {
    get current() {
      return session;
    },
    get isAuthenticated() {
      return session !== null;
    },
    get accessToken() {
      return session?.accessToken ?? null;
    },
    set,
    clear
  };
}
const sessionStore = createSessionStore();
export {
  sessionStore as s
};
