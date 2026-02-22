import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';
import { Colors, Radius, Spacing, Typography } from '../designsystem';
import {
  applyDownloadedOtaUpdate,
  dismissBinaryPrompt,
  resolveUpdatePrompt,
  type UpdatePrompt,
} from '../services/appUpdates';

const formatNotes = (notes: string): string[] => {
  const raw = String(notes || '').split('\n');
  const lines = raw.map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return ['No changelog details provided for this release.'];
  return lines;
};

export function AppUpdateGate() {
  const [prompt, setPrompt] = useState<UpdatePrompt | null>(null);
  const [loading, setLoading] = useState(false);

  const checkUpdates = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await resolveUpdatePrompt();
      setPrompt(result);
    } catch (_) {
      // Do not block app usage if update checks fail.
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    checkUpdates();
  }, [checkUpdates]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkUpdates();
    });

    return () => subscription.remove();
  }, [checkUpdates]);

  const notes = useMemo(() => formatNotes(prompt?.notes || ''), [prompt?.notes]);
  const isBinary = prompt?.kind === 'binary';
  const isMandatory = !!prompt?.mandatory;

  const handleUpdateNow = useCallback(async () => {
    if (!prompt) return;

    if (prompt.kind === 'binary') {
      try {
        await Linking.openURL(prompt.downloadUrl);
      } catch (_) {
        Alert.alert('Update Error', 'Could not open the download link. Please try again.');
      }
      return;
    }

    try {
      await applyDownloadedOtaUpdate();
    } catch (_) {
      Alert.alert('Update Error', 'Could not restart into the downloaded update.');
    }
  }, [prompt]);

  const handleLater = useCallback(async () => {
    if (!prompt) return;
    if (prompt.kind === 'binary') {
      await dismissBinaryPrompt(prompt.latestVersion, prompt.publishedAt);
    }
    setPrompt(null);
  }, [prompt]);

  return (
    <Modal
      visible={!!prompt}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isMandatory) setPrompt(null);
      }}
    >
      <View style={styles.overlay}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <Text style={styles.overline}>Update Available</Text>
          <Text style={styles.title}>
            {isBinary ? 'New App Version Ready' : 'Restart To Apply Update'}
          </Text>

          {isBinary && prompt && (
            <Text style={styles.versionText}>
              Current: v{prompt.currentVersion}  Latest: v{prompt.latestVersion}
            </Text>
          )}

          <ScrollView style={styles.notesBox} contentContainerStyle={styles.notesContent}>
            {notes.map((line, index) => (
              <Text key={`${line}-${index}`} style={styles.noteLine}>
                {line.startsWith('- ') ? line : `- ${line}`}
              </Text>
            ))}
          </ScrollView>

          {isMandatory && (
            <Text style={styles.mandatoryText}>
              This update is required to continue using the app.
            </Text>
          )}

          <View style={styles.actions}>
            {!isMandatory && (
              <Pressable style={styles.secondaryBtn} onPress={handleLater}>
                <Text style={styles.secondaryBtnText}>Later</Text>
              </Pressable>
            )}
            <Pressable style={styles.primaryBtn} onPress={handleUpdateNow}>
              <Text style={styles.primaryBtnText}>
                {isBinary ? 'Update Now' : 'Restart Now'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.L,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: Radius.L,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
    backgroundColor: Colors.EFFECTS.MODAL_BG,
    padding: Spacing.L,
    gap: Spacing.M,
  },
  overline: {
    ...Typography.OVERLINE,
    color: Colors.TEXT_MUTED,
  },
  title: {
    ...Typography.H2,
    color: Colors.TEXT_NORMAL,
  },
  versionText: {
    ...Typography.CAPTION,
    color: Colors.TEXT_MUTED,
  },
  notesBox: {
    maxHeight: 220,
    borderRadius: Radius.M,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
    backgroundColor: Colors.EFFECTS.CARD_BG,
  },
  notesContent: {
    paddingVertical: Spacing.S,
  },
  noteLine: {
    ...Typography.BODY_SMALL,
    color: Colors.TEXT_NORMAL,
    paddingHorizontal: Spacing.M,
    paddingVertical: Spacing.XS,
  },
  mandatoryText: {
    ...Typography.CAPTION,
    color: Colors.WARNING,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.S,
  },
  secondaryBtn: {
    borderRadius: Radius.M,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
    backgroundColor: Colors.EFFECTS.CARD_BG,
    paddingHorizontal: Spacing.M,
    paddingVertical: Spacing.S,
  },
  secondaryBtnText: {
    ...Typography.BODY_SMALL,
    color: Colors.TEXT_MUTED,
  },
  primaryBtn: {
    borderRadius: Radius.M,
    backgroundColor: Colors.ACCENT,
    paddingHorizontal: Spacing.M,
    paddingVertical: Spacing.S,
  },
  primaryBtnText: {
    ...Typography.BODY_SMALL,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default AppUpdateGate;
