/**
 * Friends Screen - Enhanced with friend requests and management
 * 
 * Tabs: All Friends | Pending | Blocked
 * Features: Add friends, accept/decline requests, remove/block users
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  TextInput, 
  RefreshControl, 
  StyleSheet, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, SpringConfig } from '../../src/designsystem';
import { searchUsers, startDm, getMediaUrl } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { Avatar } from '../../src/components/Avatar';
import { useFriends, Friend, FriendRequest, BlockedUser } from '../../src/hooks/useFriends';

type TabType = 'all' | 'pending' | 'blocked' | 'add';

interface User {
  id: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
}

export default function FriendsScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { 
    friends, 
    requests, 
    blockedUsers,
    loading,
    requestCount,
    refresh,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    block,
    unblock,
  } = useFriends();

  // Load data on mount
  useEffect(() => {
    refresh();
  }, []);

  // Search users when on Add tab
  useEffect(() => {
    if (activeTab !== 'add') return;
    
    const timeout = setTimeout(async () => {
      if (searchQuery.trim()) {
        setSearchLoading(true);
        try {
          const { data } = await searchUsers(searchQuery);
          // Filter out current user and existing friends
          const friendIds = new Set(friends.map(f => f.id));
          setSearchResults(
            (data as User[]).filter(u => 
              u.id !== currentUser?.id && !friendIds.has(u.id)
            )
          );
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, activeTab, friends, currentUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleStartDm = async (userId: number, name: string) => {
    try {
      const { data } = await startDm(userId);
      const chatId = (data as any).chatId || (data as any).id;
      router.push(`/chat/${chatId}?name=${encodeURIComponent(name)}`);
    } catch (err) {
      console.error('Failed to start DM:', err);
    }
  };

  const handleRemoveFriend = (userId: number, name: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeFriend(userId)
        }
      ]
    );
  };

  const handleBlockUser = (userId: number, name: string) => {
    Alert.alert(
      'Block User',
      `Block ${name}? You won't see their messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => block(userId)
        }
      ]
    );
  };

  // Render tabs
  const tabs: { key: TabType; label: string; icon: string; badge?: number }[] = [
    { key: 'all', label: 'All', icon: 'people' },
    { key: 'pending', label: 'Pending', icon: 'mail', badge: requestCount },
    { key: 'blocked', label: 'Blocked', icon: 'ban' },
    { key: 'add', label: 'Add', icon: 'person-add' },
  ];

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.key ? Colors.ACCENT : Colors.TEXT_MUTED} 
            />
            <Text style={[
              styles.tabLabel, 
              activeTab === tab.key && styles.tabLabelActive
            ]}>
              {tab.label}
            </Text>
            {tab.badge && tab.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Search (Add tab only) */}
      {activeTab === 'add' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.TEXT_MUTED} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by username..."
              placeholderTextColor={Colors.TEXT_MUTED}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.TEXT_MUTED} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.ACCENT} />
        </View>
      ) : (
        <>
          {activeTab === 'all' && (
            <FriendsList 
              friends={friends}
              onDm={handleStartDm}
              onRemove={handleRemoveFriend}
              onBlock={handleBlockUser}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === 'pending' && (
            <RequestsList 
              requests={requests}
              onAccept={acceptRequest}
              onDecline={declineRequest}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === 'blocked' && (
            <BlockedList 
              blocked={blockedUsers}
              onUnblock={unblock}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === 'add' && (
            <SearchResultsList 
              results={searchResults}
              loading={searchLoading}
              onSendRequest={sendRequest}
              hasQuery={searchQuery.trim().length > 0}
            />
          )}
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Friends List
// ─────────────────────────────────────────────────────────────

interface FriendsListProps {
  friends: Friend[];
  onDm: (userId: number, name: string) => void;
  onRemove: (userId: number, name: string) => void;
  onBlock: (userId: number, name: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

function FriendsList({ friends, onDm, onRemove, onBlock, refreshing, onRefresh }: FriendsListProps) {
  return (
    <FlatList
      data={friends}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <FriendCard 
          friend={item} 
          onDm={() => onDm(item.id, item.display_name || item.username)}
          onRemove={() => onRemove(item.id, item.display_name || item.username)}
          onBlock={() => onBlock(item.id, item.display_name || item.username)}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ACCENT} />
      }
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyState 
          icon="people-outline" 
          title="No Friends Yet" 
          subtitle="Add friends to start chatting!" 
        />
      }
    />
  );
}

function FriendCard({ friend, onDm, onRemove, onBlock }: { 
  friend: Friend; 
  onDm: () => void;
  onRemove: () => void;
  onBlock: () => void;
}) {
  const scale = useSharedValue(1);
  const [showActions, setShowActions] = useState(false);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onDm}
      onLongPress={() => setShowActions(!showActions)}
      onPressIn={() => { scale.value = withSpring(0.98, SpringConfig.MICRO); }}
      onPressOut={() => { scale.value = withSpring(1, SpringConfig.MICRO); }}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <Avatar
          source={friend.avatar_url ? getMediaUrl(friend.avatar_url) : undefined}
          size="medium"
          status="offline"
          showStatus={true}
        />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{friend.display_name || friend.username}</Text>
          <Text style={styles.username}>@{friend.username}</Text>
        </View>
        {showActions ? (
          <View style={styles.actionRow}>
            <Pressable style={styles.iconBtn} onPress={onRemove}>
              <Ionicons name="person-remove" size={18} color={Colors.ERROR} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={onBlock}>
              <Ionicons name="ban" size={18} color={Colors.ERROR} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.iconBtn} onPress={onDm}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.INTERACTIVE_NORMAL} />
          </Pressable>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Requests List
// ─────────────────────────────────────────────────────────────

interface RequestsListProps {
  requests: FriendRequest[];
  onAccept: (id: number) => Promise<boolean>;
  onDecline: (id: number) => Promise<boolean>;
  refreshing: boolean;
  onRefresh: () => void;
}

function RequestsList({ requests, onAccept, onDecline, refreshing, onRefresh }: RequestsListProps) {
  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <RequestCard 
          request={item} 
          onAccept={() => onAccept(item.id)}
          onDecline={() => onDecline(item.id)}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ACCENT} />
      }
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyState 
          icon="mail-outline" 
          title="No Pending Requests" 
          subtitle="Friend requests will appear here" 
        />
      }
    />
  );
}

function RequestCard({ request, onAccept, onDecline }: { 
  request: FriendRequest; 
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={styles.card}>
      <Avatar
        source={request.avatar_url ? getMediaUrl(request.avatar_url) : undefined}
        size="medium"
      />
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{request.display_name || request.username}</Text>
        <Text style={styles.username}>@{request.username}</Text>
      </View>
      <View style={styles.actionRow}>
        <Pressable style={[styles.actionBtn, styles.acceptBtn]} onPress={onAccept}>
          <Ionicons name="checkmark" size={18} color="#fff" />
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.declineBtn]} onPress={onDecline}>
          <Ionicons name="close" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Blocked List
// ─────────────────────────────────────────────────────────────

interface BlockedListProps {
  blocked: BlockedUser[];
  onUnblock: (userId: number) => Promise<boolean>;
  refreshing: boolean;
  onRefresh: () => void;
}

function BlockedList({ blocked, onUnblock, refreshing, onRefresh }: BlockedListProps) {
  return (
    <FlatList
      data={blocked}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Avatar
            source={item.avatar_url ? getMediaUrl(item.avatar_url) : undefined}
            size="medium"
          />
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>{item.display_name || item.username}</Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
          <Pressable 
            style={[styles.actionBtn, styles.unblockBtn]} 
            onPress={() => onUnblock(item.user_id)}
          >
            <Text style={styles.unblockText}>Unblock</Text>
          </Pressable>
        </View>
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ACCENT} />
      }
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyState 
          icon="ban-outline" 
          title="No Blocked Users" 
          subtitle="Blocked users will appear here" 
        />
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Search Results
// ─────────────────────────────────────────────────────────────

interface SearchResultsListProps {
  results: User[];
  loading: boolean;
  onSendRequest: (userId: number) => Promise<boolean>;
  hasQuery: boolean;
}

function SearchResultsList({ results, loading, onSendRequest, hasQuery }: SearchResultsListProps) {
  const [sentTo, setSentTo] = useState<Set<number>>(new Set());

  const handleSend = async (userId: number) => {
    const success = await onSendRequest(userId);
    if (success) {
      setSentTo(prev => new Set(prev).add(userId));
    }
  };

  if (!hasQuery) {
    return (
      <EmptyState 
        icon="person-add-outline" 
        title="Find Friends" 
        subtitle="Search for users by username" 
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.ACCENT} />
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Avatar
            source={item.avatarUrl ? getMediaUrl(item.avatarUrl) : undefined}
            size="medium"
          />
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>{item.displayName || item.username}</Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
          {sentTo.has(item.id) ? (
            <View style={[styles.actionBtn, styles.sentBtn]}>
              <Ionicons name="checkmark" size={18} color={Colors.ACCENT} />
              <Text style={styles.sentText}>Sent</Text>
            </View>
          ) : (
            <Pressable 
              style={[styles.actionBtn, styles.addBtn]} 
              onPress={() => handleSend(item.id)}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
            </Pressable>
          )}
        </View>
      )}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyState 
          icon="search-outline" 
          title="No Results" 
          subtitle="Try a different search" 
        />
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon as any} size={64} color={Colors.TEXT_MUTED} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{subtitle}</Text>
    </View>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.SM,
    paddingTop: Spacing.SM,
    paddingBottom: Spacing.XS,
    gap: Spacing.XS,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.S,
    paddingHorizontal: Spacing.S,
    borderRadius: Radius.M,
    backgroundColor: Colors.SURFACE,
    gap: 4,
  },
  tabActive: {
    backgroundColor: Colors.EFFECTS.GLASS_BG,
    borderWidth: 1,
    borderColor: Colors.ACCENT + '40',
  },
  tabLabel: {
    color: Colors.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.ACCENT,
  },
  badge: {
    backgroundColor: Colors.ERROR,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    padding: Spacing.SM,
    paddingTop: Spacing.XS,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.EFFECTS.INPUT_BG,
    borderRadius: Radius.M,
    paddingHorizontal: Spacing.SM,
    paddingVertical: Spacing.S,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.S,
    color: Colors.TEXT_NORMAL,
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: Spacing.SM,
    paddingTop: Spacing.XS,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.SM,
    backgroundColor: Colors.SURFACE,
    borderRadius: Radius.L,
    marginBottom: Spacing.S,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.SM,
  },
  displayName: {
    color: Colors.TEXT_NORMAL,
    fontWeight: '600',
    fontSize: 15,
  },
  username: {
    color: Colors.TEXT_MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  iconBtn: {
    padding: Spacing.S,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.XS,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.XS,
    paddingHorizontal: Spacing.SM,
    borderRadius: Radius.M,
    gap: 4,
  },
  acceptBtn: {
    backgroundColor: Colors.SUCCESS,
  },
  declineBtn: {
    backgroundColor: Colors.ERROR,
  },
  addBtn: {
    backgroundColor: Colors.ACCENT,
  },
  sentBtn: {
    backgroundColor: Colors.SURFACE,
    borderWidth: 1,
    borderColor: Colors.ACCENT + '40',
  },
  sentText: {
    color: Colors.ACCENT,
    fontSize: 13,
    fontWeight: '500',
  },
  unblockBtn: {
    backgroundColor: Colors.SURFACE,
    borderWidth: 1,
    borderColor: Colors.TEXT_MUTED,
  },
  unblockText: {
    color: Colors.TEXT_NORMAL,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: Colors.TEXT_NORMAL,
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.M,
  },
  emptyText: {
    color: Colors.TEXT_MUTED,
    marginTop: Spacing.XS,
  },
});
