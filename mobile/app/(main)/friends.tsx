/**
 * Friends Screen - User search and DM starter
 * 
 * Discord-style design with dark theme
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  TextInput, 
  RefreshControl, 
  Image, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, SpringConfig, Sizes } from '../../src/designsystem';
import { searchUsers, startDm, getMediaUrl } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { Avatar } from '../../src/components/Avatar';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async (query?: string) => {
    try {
      setLoading(true);
      const { data } = await searchUsers(query);
      // Filter out current user
      setUsers((data as User[]).filter(u => u.id !== currentUser?.id));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers(searchQuery || undefined);
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

  const renderUser = ({ item }: { item: User }) => (
    <UserCard
      user={item}
      onPress={() => handleStartDm(item.id, item.displayName || item.username)}
    />
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.TEXT_MUTED} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search users..."
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

      {loading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.ACCENT} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUser}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={Colors.ACCENT} 
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={Colors.TEXT_MUTED} />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptyText}>Try a different search</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// User Card
// ─────────────────────────────────────────────────────────────

interface UserCardProps {
  user: User;
  onPress: () => void;
}

function UserCard({ user, onPress }: UserCardProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.98, SpringConfig.MICRO); }}
      onPressOut={() => { scale.value = withSpring(1, SpringConfig.MICRO); }}
    >
      <Animated.View style={[styles.userCard, animatedStyle]}>
        <Avatar
          source={user.avatarUrl ? getMediaUrl(user.avatarUrl) : undefined}
          size="medium"
          status={user.status || 'offline'}
          showStatus={true}
        />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{user.displayName || user.username}</Text>
          <Text style={styles.username}>@{user.username}</Text>
        </View>
        <View style={styles.actionIcon}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.INTERACTIVE_NORMAL} />
        </View>
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
  searchContainer: {
    padding: Spacing.SM,
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
    paddingTop: 0,
  },
  userCard: {
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
  actionIcon: {
    padding: Spacing.S,
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
