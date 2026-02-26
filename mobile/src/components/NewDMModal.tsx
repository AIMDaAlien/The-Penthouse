/**
 * NewDMModal - Create a new direct message
 * 
 * Search for users and start a DM conversation
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, SpringConfig } from '../designsystem';
import { searchUsers, startDm, getMediaUrl } from '../services/api';
import { useToast } from './Toast';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface User {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface NewDMModalProps {
  visible: boolean;
  onClose: () => void;
  onDMCreated: (chatId: number) => void;
}

// ─────────────────────────────────────────────────────────────
// User Row
// ─────────────────────────────────────────────────────────────

interface UserRowProps {
  user: User;
  onPress: () => void;
  loading?: boolean;
}

function UserRow({ user, onPress, loading }: UserRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.userRow,
        pressed && styles.userRowPressed,
      ]}
    >
      {/* Avatar */}
      {user.avatarUrl ? (
        <Image source={{ uri: getMediaUrl(user.avatarUrl) }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {(user.displayName || user.username).charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>
          {user.displayName || user.username}
        </Text>
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      {/* Action */}
      {loading ? (
        <ActivityIndicator size="small" color={Colors.ACCENT} />
      ) : (
        <Ionicons name="chatbubble" size={20} color={Colors.ACCENT} />
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function NewDMModal({ visible, onClose, onDMCreated }: NewDMModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const toast = useToast();

  // Search users on query change
  useEffect(() => {
    const search = async () => {
      if (!visible) return;
      
      try {
        setLoading(true);
        const { data } = await searchUsers(searchQuery || undefined);
        setUsers(data as User[]);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, visible]);

  // Clear on close
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setUsers([]);
      setSelectedUserId(null);
    }
  }, [visible]);

  const handleSelectUser = useCallback(async (user: User) => {
    try {
      setSelectedUserId(user.id);
      const { data } = await startDm(user.id);
      const chatId = (data as any).id;
      toast.success(`Started chat with ${user.displayName || user.username}`);
      onDMCreated(chatId);
      onClose();
    } catch (err) {
      console.error('Failed to start DM:', err);
      toast.error('Failed to start conversation');
    } finally {
      setSelectedUserId(null);
    }
  }, [onDMCreated, onClose, toast]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable style={styles.modalContainerWrapper} onPress={e => e.stopPropagation()}>
            <Animated.View
              entering={SlideInDown.springify().damping(22).stiffness(260)}
              style={styles.modal}
            >
              {/* Blur background */}
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.modalBackground} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>New Message</Text>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.TEXT_MUTED} />
                </Pressable>
              </View>

              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={Colors.TEXT_MUTED} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search for friends..."
                  placeholderTextColor={Colors.TEXT_MUTED}
                  style={styles.searchInput}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.TEXT_MUTED} />
                  </Pressable>
                )}
              </View>

              {/* Results */}
              <View style={styles.results}>
                {loading && users.length === 0 ? (
                  <View style={styles.centered}>
                    <ActivityIndicator color={Colors.ACCENT} />
                  </View>
                ) : users.length === 0 ? (
                  <View style={styles.centered}>
                    <Ionicons name="people-outline" size={32} color={Colors.TEXT_MUTED} />
                    <Text style={styles.noResults}>
                      {searchQuery ? 'No users found' : 'Search for friends'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <UserRow
                        user={item}
                        onPress={() => handleSelectUser(item)}
                        loading={selectedUserId === item.id}
                      />
                    )}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  />
                )}
              </View>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainerWrapper: {
    flex: 1,
  },
  modal: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: Radius.L,
    borderTopRightRadius: Radius.L,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.EFFECTS.PANEL_BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.M,
    paddingTop: Spacing.M,
    paddingBottom: Spacing.SM,
  },
  title: {
    ...Typography.H2,
    color: Colors.TEXT_NORMAL,
    fontSize: 18,
  },
  closeButton: {
    padding: Spacing.XS,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.M,
    marginBottom: Spacing.M,
    paddingHorizontal: Spacing.SM,
    paddingVertical: Spacing.S,
    backgroundColor: Colors.EFFECTS.INPUT_BG,
    borderRadius: Radius.M,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.S,
    color: Colors.TEXT_NORMAL,
    fontSize: 15,
  },
  results: {
    flex: 1,
    paddingBottom: Spacing.XL,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.XL,
  },
  noResults: {
    ...Typography.BODY,
    color: Colors.TEXT_MUTED,
    marginTop: Spacing.SM,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.SM,
    paddingHorizontal: Spacing.M,
    marginHorizontal: Spacing.S,
    marginVertical: 2,
    borderRadius: Radius.M,
  },
  userRowPressed: {
    backgroundColor: Colors.SURFACE,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.H3,
    color: Colors.TEXT_NORMAL,
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.SM,
  },
  displayName: {
    ...Typography.BODY,
    color: Colors.TEXT_NORMAL,
    fontWeight: '600',
  },
  username: {
    ...Typography.MICRO,
    color: Colors.TEXT_MUTED,
  },
});

export default NewDMModal;
