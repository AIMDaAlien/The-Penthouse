import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../designsystem';
import { getServerStatus, subscribeServerStatus, type ServerStatus } from '../services/serverStatus';

const formatAgo = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
};

export function ServerStatusBanner() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<ServerStatus>(() => getServerStatus());
  const [dismissedAtMs, setDismissedAtMs] = useState<number | null>(null);

  useEffect(() => {
    const sub = subscribeServerStatus(setStatus);
    return () => sub.remove();
  }, []);

  // Auto-reset dismiss when server comes back.
  useEffect(() => {
    if (status.online) setDismissedAtMs(null);
  }, [status.online]);

  const hidden = status.online || (dismissedAtMs !== null && !status.online);
  const lastOkAgo = useMemo(() => {
    if (!status.lastOkAtMs) return null;
    return formatAgo(Date.now() - status.lastOkAtMs);
  }, [status.lastOkAtMs, status.online]);

  if (hidden) return null;

  const top = insets.top + Spacing.S;

  return (
    <View pointerEvents="box-none" style={[styles.container, { top }]}>
      <Pressable
        onPress={() => setDismissedAtMs(Date.now())}
        style={styles.banner}
        accessibilityRole="button"
        accessibilityLabel="Server connection warning. Tap to dismiss."
      >
        <Text style={styles.title}>Server unreachable</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {status.reason || 'Unable to reach server.'}
          {lastOkAgo ? ` Last connected ${lastOkAgo}.` : ''}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.M,
    right: Spacing.M,
    zIndex: 9999,
  },
  banner: {
    borderRadius: 14,
    paddingVertical: Spacing.S,
    paddingHorizontal: Spacing.M,
    backgroundColor: Colors.EFFECTS.PANEL_BG,
    borderWidth: 1,
    borderColor: 'rgba(184, 112, 128, 0.55)', // Colors.ERROR but translucent
  },
  title: {
    color: Colors.TEXT_NORMAL,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  subtitle: {
    color: Colors.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
});

