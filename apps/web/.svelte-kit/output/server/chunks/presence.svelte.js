import "clsx";
import { io } from "socket.io-client";
const PUBLIC_API_URL = "http://localhost:3000";
const PUBLIC_SOCKET_URL = "http://localhost:3000";
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
function createPresenceStore() {
  let isOnline = true;
  let inactivityTimer = null;
  const INACTIVITY_TIMEOUT = 6e4;
  let userPresenceMap = /* @__PURE__ */ new Map();
  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (!isOnline) {
      setOnline(true);
    }
    inactivityTimer = setTimeout(
      () => {
        setOnline(false);
      },
      INACTIVITY_TIMEOUT
    );
  }
  function setOnline(online) {
    if (isOnline === online) return;
    isOnline = online;
    const socket = socketStore.instance;
    if (socket) {
      socket.emit("presence.update", { online });
    }
  }
  function initializeSocketListeners() {
    const socket = socketStore.instance;
    if (!socket) return;
    socket.on("presence.sync", (payload) => {
      userPresenceMap = new Map(Object.entries(payload));
    });
    socket.on("presence.update", (payload) => {
      const nextMap = new Map(userPresenceMap);
      nextMap.set(payload.userId, payload.online);
      userPresenceMap = nextMap;
    });
  }
  if (typeof window !== "undefined") {
    const events = ["mousemove", "keydown", "touchstart"];
    const handleActivity = () => resetInactivityTimer();
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });
    resetInactivityTimer();
    window.addEventListener("beforeunload", () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimer) clearTimeout(inactivityTimer);
    });
  }
  return {
    get isOnline() {
      return isOnline;
    },
    setOnline,
    get userPresenceMap() {
      return userPresenceMap;
    },
    initializeSocketListeners
  };
}
createPresenceStore();
export {
  PUBLIC_API_URL as P,
  socketStore as s
};
