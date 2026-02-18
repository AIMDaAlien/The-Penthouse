import { DeviceEventEmitter } from 'react-native';

export type ServerStatus = {
  online: boolean;
  lastOkAtMs: number | null;
  lastErrorAtMs: number | null;
  reason?: string;
};

const state: ServerStatus = {
  online: true,
  lastOkAtMs: null,
  lastErrorAtMs: null,
};

const emit = () => {
  DeviceEventEmitter.emit('server:status', { ...state });
};

export const getServerStatus = (): ServerStatus => ({ ...state });

export const setServerOnline = () => {
  const now = Date.now();
  state.online = true;
  state.lastOkAtMs = now;
  state.reason = undefined;
  emit();
};

export const setServerOffline = (reason?: string) => {
  const now = Date.now();
  state.online = false;
  state.lastErrorAtMs = now;
  state.reason = reason || 'Unable to reach server';
  emit();
};

export const subscribeServerStatus = (handler: (s: ServerStatus) => void) =>
  DeviceEventEmitter.addListener('server:status', handler);

