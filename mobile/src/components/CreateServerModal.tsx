/**
 * CreateServerModal - Create a new server
 * 
 * Discord-style modal with:
 * - Server name input
 * - Icon upload option
 * - Animated buttons
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  Pressable, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, SpringConfig, Glows } from '../designsystem';
import { createServer, uploadServerIcon } from '../services/api';

interface CreateServerModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (serverId: number, serverName: string) => void;
}

export default function CreateServerModal({ visible, onClose, onCreated }: CreateServerModalProps) {
  const [serverName, setServerName] = useState('');
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [iconFileSize, setIconFileSize] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const SERVER_ICON_MAX_BYTES = 25 * 1024 * 1024;

  const iconTooLarge = !!iconFileSize && iconFileSize > SERVER_ICON_MAX_BYTES;
  const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  const getErrorMessage = (err: any, fallback: string) =>
    err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;

  const handlePickIcon = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let fileSize = typeof asset.fileSize === 'number' ? asset.fileSize : null;

        if (!fileSize && asset.uri) {
          try {
            const info = await FileSystem.getInfoAsync(asset.uri);
            if (info.exists && typeof info.size === 'number') {
              fileSize = info.size;
            }
          } catch (fileInfoErr) {
            console.warn('Could not read selected icon size:', fileInfoErr);
          }
        }

        setIconUri(asset.uri);
        setIconFileSize(fileSize);

        if (fileSize && fileSize > SERVER_ICON_MAX_BYTES) {
          Alert.alert('Icon too large', `Server icon must be 25 MB or smaller. Selected: ${formatMb(fileSize)}.`);
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  const handleCreate = async () => {
    if (!serverName.trim()) {
      Alert.alert('Error', 'Please enter a server name');
      return;
    }
    if (iconTooLarge) {
      Alert.alert('Icon too large', 'Please choose an image smaller than 25 MB.');
      return;
    }

    try {
      setCreating(true);
      
      let iconUrl: string | undefined;
      
      // Upload icon if selected
      if (iconUri) {
        setUploadingIcon(true);
        try {
          const { data } = await uploadServerIcon({
            uri: iconUri,
            name: 'server-icon.jpg',
            type: 'image/jpeg',
          });
          iconUrl = (data as any).iconUrl;
        } catch (err) {
          console.error('Icon upload failed:', err);
          Alert.alert('Icon upload failed', getErrorMessage(err, 'Unable to upload server icon.'));
          return;
        } finally {
          setUploadingIcon(false);
        }
      }

      const { data } = await createServer(serverName.trim(), iconUrl);
      const responseData = data as any;
      const serverId = responseData.id || responseData.serverId;
      
      Alert.alert('Success', `"${serverName.trim()}" has been created!`);
      onCreated?.(serverId, serverName.trim());
      handleClose();
    } catch (err: any) {
      console.error('Failed to create server:', err);
      Alert.alert('Error', getErrorMessage(err, 'Failed to create server'));
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setServerName('');
    setIconUri(null);
    setIconFileSize(null);
    onClose();
  };

  const isDisabled = creating || !serverName.trim() || iconTooLarge;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <Animated.View 
              entering={SlideInDown.springify().damping(22).stiffness(260)}
              style={styles.modal}
            >
              {/* Blur background */}
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.modalBackground} />
              
              {/* Content */}
              <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>Create Your Server</Text>
                  <Pressable onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={Colors.TEXT_MUTED} />
                  </Pressable>
                </View>

                <Text style={styles.subtitle}>
                  Your server is where you and your friends hang out. Make yours and start chatting.
                </Text>

                {/* Icon Picker */}
                <Pressable onPress={handlePickIcon} style={styles.iconPicker}>
                  {iconUri ? (
                    <Image source={{ uri: iconUri }} style={styles.iconPreview} />
                  ) : (
                    <View style={styles.iconPlaceholder}>
                      <Ionicons name="camera" size={28} color={Colors.TEXT_MUTED} />
                      <Text style={styles.iconLabel}>UPLOAD</Text>
                    </View>
                  )}
                  <View style={styles.iconBadge}>
                    <Ionicons name="add" size={16} color={Colors.TEXT_NORMAL} />
                  </View>
                </Pressable>
                <Text style={[styles.iconMeta, iconTooLarge && styles.iconMetaError]}>
                  {iconFileSize
                    ? `Selected: ${formatMb(iconFileSize)} / Max: ${formatMb(SERVER_ICON_MAX_BYTES)}`
                    : `Max icon size: ${formatMb(SERVER_ICON_MAX_BYTES)}`}
                </Text>

                {/* Server Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>SERVER NAME</Text>
                  <TextInput
                    value={serverName}
                    onChangeText={setServerName}
                    placeholder="Enter server name"
                    placeholderTextColor={Colors.TEXT_MUTED}
                    style={styles.input}
                    maxLength={100}
                    autoFocus
                  />
                </View>

                {/* Create Button */}
                <AnimatedButton
                  onPress={handleCreate}
                  disabled={isDisabled}
                  loading={creating || uploadingIcon}
                  label={uploadingIcon ? "Uploading icon..." : "Create Server"}
                />

                {/* Terms */}
                <Text style={styles.terms}>
                  By creating a server, you agree to our community guidelines.
                </Text>
              </View>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Animated Button
// ─────────────────────────────────────────────────────────────

interface AnimatedButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
}

function AnimatedButton({ onPress, disabled, loading, label }: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => { scale.value = withSpring(0.98, SpringConfig.MICRO); }}
      onPressOut={() => { scale.value = withSpring(1, SpringConfig.MICRO); }}
    >
      <Animated.View 
        style={[
          styles.button,
          disabled && styles.buttonDisabled,
          animatedStyle
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.TEXT_NORMAL} />
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: Spacing.M,
  },
  modal: {
    borderRadius: Radius.L,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.EFFECTS.PANEL_BG,
  },
  content: {
    padding: Spacing.L,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.S,
  },
  title: {
    ...Typography.H1,
    color: Colors.TEXT_NORMAL,
    fontSize: 20,
  },
  closeButton: {
    padding: Spacing.XS,
  },
  subtitle: {
    ...Typography.BODY,
    color: Colors.TEXT_MUTED,
    marginBottom: Spacing.L,
    lineHeight: 20,
  },
  iconPicker: {
    alignSelf: 'center',
    marginBottom: Spacing.L,
    position: 'relative',
  },
  iconPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.ACCENT,
    borderStyle: 'dashed',
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.TEXT_MUTED,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    ...Typography.MICRO,
    color: Colors.TEXT_MUTED,
    marginTop: 4,
  },
  iconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMeta: {
    ...Typography.MICRO,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    marginBottom: Spacing.M,
  },
  iconMetaError: {
    color: Colors.ERROR,
  },
  inputContainer: {
    marginBottom: Spacing.L,
  },
  label: {
    ...Typography.OVERLINE,
    color: Colors.TEXT_MUTED,
    marginBottom: Spacing.XS,
  },
  input: {
    backgroundColor: Colors.EFFECTS.INPUT_BG,
    borderRadius: Radius.M,
    paddingHorizontal: Spacing.M,
    paddingVertical: Spacing.SM,
    color: Colors.TEXT_NORMAL,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
  button: {
    backgroundColor: Colors.ACCENT,
    borderRadius: Radius.M,
    paddingVertical: Spacing.SM,
    alignItems: 'center',
    marginBottom: Spacing.M,
    ...Glows.SELECTED,
  },
  buttonDisabled: {
    backgroundColor: Colors.SURFACE,
    shadowOpacity: 0,
  },
  buttonText: {
    color: Colors.TEXT_NORMAL,
    fontWeight: '600',
    fontSize: 15,
  },
  terms: {
    ...Typography.MICRO,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
  },
});
