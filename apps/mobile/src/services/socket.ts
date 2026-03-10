import { Capacitor } from '@capacitor/core';
import { io, type Socket } from 'socket.io-client';
import { ensureRealtimeAccessToken } from './http';
import { resolveApiBase } from './runtime';

const SOCKET_URL = resolveApiBase();
const SOCKET_PATH = '/socket.io/';

function resolveTransports(): Array<'polling' | 'websocket'> {
  if (Capacitor.getPlatform() === 'android') {
    return ['polling', 'websocket'];
  }
  return ['websocket', 'polling'];
}

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: resolveTransports(),
    autoConnect: false,
    rememberUpgrade: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 800,
    reconnectionDelayMax: 6000,
    timeout: 8000,
    auth: (callback) => {
      void ensureRealtimeAccessToken().then((token) => {
        callback(token ? { token } : {});
      }).catch(() => {
        callback({});
      });
    }
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
