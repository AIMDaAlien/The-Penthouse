/**
 * Profile Screen - User profile management
 * 
 * Discord-style design with dark theme
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  Image, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  StyleSheet,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, SpringConfig, Glows } from '../../src/designsystem';
import { useAuth } from '../../src/context/AuthContext';
import { uploadAvatar, updateProfile, getMediaUrl } from '../../src/services/api';
import { storage } from '../../src/services/storage';
import { Avatar } from '../../src/components/Avatar';

export default function ProfileScreen() {
  const { user, updateProfile: updateAuthProfile, logout } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingAvatar(true);

        try {
          const { data } = await uploadAvatar({
            uri: asset.uri,
            name: asset.fileName || 'avatar.jpg',
            type: asset.mimeType || 'image/jpeg',
          });
          setAvatarUrl(data.avatarUrl);
          await updateAuthProfile(displayName || undefined, data.avatarUrl);
          Alert.alert('Success', 'Avatar updated!');
        } catch (err) {
          console.error('Avatar upload failed:', err);
          Alert.alert('Error', 'Failed to upload avatar');
        } finally {
          setUploadingAvatar(false);
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await updateProfile(displayName.trim(), avatarUrl || undefined);
      await updateAuthProfile(displayName.trim(), avatarUrl || undefined);
      Alert.alert('Success', 'Profile updated!');
    } catch (err) {
      console.error('Profile update failed:', err);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        logout().then(() => router.replace('/login'));
      }
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleIncinerate = () => {
    if (Platform.OS === 'web') {
        if (window.confirm('DATA INCINERATOR\n\nThis will permanently delete authentication data and log you out. Are you sure?')) {
            (async () => {
                try {
                    setSaving(true); 
                    await storage.deleteItem('token');
                    await logout();
                    window.alert('💥 Data incinerated. Returning to orbit...');
                    router.replace('/login');
                } catch (error) {
                    console.error('Incineration failed:', error);
                    window.alert('Error: Failed to incinerate data.');
                } finally {
                    setSaving(false);
                }
            })();
        }
        return;
    }

    Alert.alert(
      'DATA INCINERATOR',
      'This will permanently delete authentication data and log you out. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'NUKE IT 💥',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              // Clear primary auth token
              await storage.deleteItem('token');
              // Ensure context is cleared
              await logout();
              
              Alert.alert('💥', 'Data incinerated. Returning to orbit...');
              router.replace('/login');
            } catch (error) {
              console.error('Incineration failed:', error);
              Alert.alert('Error', 'Failed to incinerate data.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.ACCENT} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
          <View style={styles.avatarContainer}>
            {uploadingAvatar ? (
              <ActivityIndicator size="large" color={Colors.ACCENT} />
            ) : (
              <Avatar
                source={avatarUrl ? getMediaUrl(avatarUrl) : undefined}
                size="xlarge"
                status="online"
                showStatus={false}
              />
            )}
          </View>
          <View style={styles.cameraButton}>
            <Ionicons name="camera" size={16} color={Colors.TEXT_NORMAL} />
          </View>
        </Pressable>
        <Text style={styles.avatarHint}>Tap to change avatar</Text>
      </View>

      {/* Username (read-only) */}
      <View style={styles.field}>
        <Text style={styles.label}>Username</Text>
        <View style={styles.readOnlyInput}>
          <Text style={styles.readOnlyText}>{user.username}</Text>
        </View>
        <Text style={styles.hint}>Username cannot be changed</Text>
      </View>

      {/* Display Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter display name"
          placeholderTextColor={Colors.TEXT_MUTED}
          style={styles.input}
        />
      </View>

      {/* Save Button */}
      <AnimatedButton
        onPress={handleSaveProfile}
        disabled={saving}
        loading={saving}
        label="Save Changes"
        variant="primary"
      />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Data Incinerator */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: Colors.ERROR }]}>DANGER ZONE</Text>
      </View>
      
      <Pressable
        style={({ pressed }) => [
            styles.incineratorButton,
            pressed && styles.incineratorButtonPressed
        ]}
        onPress={handleIncinerate}
      >
        <Ionicons name="flame" size={24} color={Colors.TEXT_NORMAL} />
        <Text style={styles.incineratorText}>DATA INCINERATOR</Text>
      </Pressable>
      <Text style={styles.incineratorHint}>
        This will wipe your session data and log you out immediately.
      </Text>

      <View style={{ height: Spacing.L }} />

      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>

      {/* Logout Button */}
      <AnimatedButton
        onPress={handleLogout}
        label="Logout"
        variant="danger"
        icon="log-out-outline"
      />

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>App Version 1.0.0</Text>
      </View>
    </ScrollView>
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
  variant: 'primary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}

function AnimatedButton({ onPress, disabled, loading, label, variant, icon }: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPrimary = variant === 'primary';
  const color = isPrimary ? Colors.ACCENT : Colors.ERROR;

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
          isPrimary ? styles.primaryButton : styles.dangerButton,
          animatedStyle
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.TEXT_NORMAL} />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={20} color={color} style={{ marginRight: Spacing.S }} />}
            <Text style={[styles.buttonText, { color: isPrimary ? Colors.TEXT_NORMAL : color }]}>
              {label}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.PRIMARY,
  },
  content: {
    padding: Spacing.M,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.XL,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    ...Glows.SELECTED,
  },
  avatarHint: {
    color: Colors.TEXT_MUTED,
    marginTop: Spacing.S,
    fontSize: 12,
  },
  field: {
    marginBottom: Spacing.M,
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
  readOnlyInput: {
    backgroundColor: Colors.SURFACE,
    borderRadius: Radius.M,
    paddingHorizontal: Spacing.M,
    paddingVertical: Spacing.SM,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
  readOnlyText: {
    color: Colors.TEXT_MUTED,
    fontSize: 15,
  },
  hint: {
    ...Typography.MICRO,
    color: Colors.TEXT_MUTED,
    marginTop: Spacing.XS,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.M,
    paddingVertical: Spacing.SM,
    marginBottom: Spacing.M,
  },
  primaryButton: {
    backgroundColor: Colors.ACCENT,
  },
  dangerButton: {
    backgroundColor: `${Colors.ERROR}15`,
    borderWidth: 1,
    borderColor: `${Colors.ERROR}40`,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.EFFECTS.PANEL_BORDER,
    marginVertical: Spacing.M,
  },
  sectionTitle: {
    ...Typography.OVERLINE,
    color: Colors.TEXT_MUTED,
    marginBottom: Spacing.M,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: Spacing.XL,
  },
  versionText: {
    ...Typography.MICRO,
    color: Colors.TEXT_MUTED,
  },
  incineratorButton: {
    backgroundColor: Colors.ERROR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.M,
    borderRadius: Radius.M,
    marginTop: Spacing.S,
    ...Glows.SELECTED, // Add a glow to make it dangerous looking
    shadowColor: Colors.ERROR,
  },
  incineratorButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  incineratorText: {
    ...Typography.H3,
    color: Colors.TEXT_NORMAL,
    marginLeft: Spacing.S,
    fontWeight: '800',
    letterSpacing: 1,
  },
  incineratorHint: {
    ...Typography.MICRO,
    color: Colors.TEXT_MUTED,
    marginTop: Spacing.S,
    textAlign: 'center',
    marginBottom: Spacing.M,
  },
  sectionHeader: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: Spacing.S, 
    marginTop: Spacing.M
  },
});
