/**
 * DMList - Direct Messages conversation list
 * 
 * Shows user's active DM conversations with:
 * - Avatar, name, last message preview
 * - Unread indicator badge
 * - Tap to open conversation
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, SpringConfig } from '../designsystem';
import { getChats, getMediaUrl } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface DM {
  id: number;
  name: string;
  type: 'dm' | 'group';
  lastMessage?: string;
  lastMessageAt?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  unreadCount?: number;
}

interface DMListProps {
  onSelectDM: (chatId: number) => void;
  onNewDM: () => void;
}

// ─────────────────────────────────────────────────────────────
// DM Row Component
// ─────────────────────────────────────────────────────────────

interface DMRowProps {
  dm: DM;
  onPress: () => void;
  unreadCount?: number;
}

const DMRow = React.memo(function DMRow({ dm, onPress, unreadCount }: DMRowProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, SpringConfig.MICRO);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfig.MICRO);
  };

  const timeAgo = dm.lastMessageAt
    ? formatDistanceToNow(new Date(dm.lastMessageAt), { addSuffix: false })
    : '';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.row, animatedStyle]}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {dm.avatarUrl ? (
            <Image source={{ uri: getMediaUrl(dm.avatarUrl) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons 
                name={dm.type === 'group' ? 'people' : 'person'} 
                size={20} 
                color={Colors.TEXT_MUTED} 
              />
            </View>
          )}
          {dm.isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>{dm.name}</Text>
            <Text style={styles.time}>{timeAgo}</Text>
          </View>
          {dm.lastMessage && (
            <Text style={styles.preview} numberOfLines={1}>
              {dm.lastMessage}
            </Text>
          )}
        </View>

        {/* Unread Badge */}
        {(unreadCount ?? 0) > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {unreadCount! > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function DMList({ onSelectDM, onNewDM }: DMListProps) {
  const [dms, setDMs] = useState<DM[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<number, number>>(new Map());

  const loadDMs = useCallback(async () => {
    try {
      const { data } = await getChats();
      
      // Filter to only DMs and sort by last message
      const dmList = (data as any[])
        .filter(c => c.type === 'dm' || c.type === 'group')
        .sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });
      setDMs(dmList);
      
      // Map unread counts from chat objects
      const counts = new Map<number, number>();
      for (const chat of dmList) {
        if (chat.unreadCount) {
          counts.set(chat.id, chat.unreadCount);
        }
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Failed to load DMs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDMs();
  }, [loadDMs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDMs();
    setRefreshing(false);
  }, [loadDMs]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Direct Messages</Text>
        <Pressable onPress={onNewDM} style={styles.newButton}>
          <Ionicons name="add" size={24} color={Colors.ACCENT} />
        </Pressable>
      </View>

      {/* DM List */}
      {dms.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-outline" size={48} color={Colors.TEXT_MUTED} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Start chatting with friends by tapping the + button
          </Text>
          <Pressable onPress={onNewDM} style={styles.startButton}>
            <Text style={styles.startButtonText}>Start a Conversation</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={dms}
          keyExtractor={(item) => item.id.toString()}
          estimatedItemSize={72}
          renderItem={({ item }) => (
            <DMRow
              dm={item}
              onPress={() => onSelectDM(item.id)}
              unreadCount={unreadCounts.get(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.ACCENT}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.M,
    paddingVertical: Spacing.SM,
    borderBottomWidth: 1,
    borderBottomColor: Colors.EFFECTS.PANEL_BORDER,
  },
  headerTitle: {
    ...Typography.H2,
    color: Colors.TEXT_NORMAL,
    fontSize: 18,
  },
  newButton: {
    padding: Spacing.XS,
  },
  list: {
    paddingVertical: Spacing.S,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.SM,
    paddingHorizontal: Spacing.M,
    marginHorizontal: Spacing.S,
    marginVertical: 2,
    borderRadius: Radius.M,
    backgroundColor: 'transparent',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.SUCCESS,
    borderWidth: 2,
    borderColor: Colors.BASE,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.SM,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    ...Typography.BODY,
    color: Colors.TEXT_NORMAL,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    ...Typography.MICRO,
    color: Colors.TEXT_MUTED,
    marginLeft: Spacing.S,
  },
  preview: {
    ...Typography.BODY,
    color: Colors.TEXT_MUTED,
    fontSize: 13,
  },
  unreadBadge: {
    backgroundColor: Colors.ACCENT,
    borderRadius: Radius.PILL,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    ...Typography.MICRO,
    color: Colors.TEXT_NORMAL,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.BODY,
    color: Colors.TEXT_MUTED,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.XL,
  },
  emptyTitle: {
    ...Typography.H3,
    color: Colors.TEXT_NORMAL,
    marginTop: Spacing.M,
    marginBottom: Spacing.XS,
  },
  emptySubtitle: {
    ...Typography.BODY,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    marginBottom: Spacing.L,
  },
  startButton: {
    backgroundColor: Colors.ACCENT,
    paddingHorizontal: Spacing.L,
    paddingVertical: Spacing.SM,
    borderRadius: Radius.M,
  },
  startButtonText: {
    color: Colors.TEXT_NORMAL,
    fontWeight: '600',
  },
});

export default DMList;
