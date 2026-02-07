/**
 * Servers Screen - Server browser and management
 * 
 * Discord-style design with dark theme
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, SpringConfig, Glows } from '../../src/designsystem';
import { useServerContext } from '../../src/context/ServerContext';
import JoinServerModal from '../../src/components/JoinServerModal';
import InviteModal from '../../src/components/InviteModal';

export default function ServersScreen() {
  const router = useRouter();
  const { servers, selectedServerId, handleServerSelect, loadServers, loadServerDetails } = useServerContext();
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteServer, setInviteServer] = useState<{ id: number; name: string } | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServers();
    setRefreshing(false);
  };

  const handleServerPress = async (serverId: number) => {
    await handleServerSelect(serverId);
    await loadServerDetails(serverId);
    router.push('/(main)');
  };

  const renderServer = ({ item }: { item: any }) => {
    const isSelected = item.id === selectedServerId;
    return (
      <ServerCard
        server={item}
        isSelected={isSelected}
        onPress={() => handleServerPress(item.id)}
        onLongPress={() => setInviteServer({ id: item.id, name: item.name })}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Action buttons */}
      <View style={styles.actionRow}>
        <ActionButton
          icon="enter-outline"
          label="Join Server"
          color={Colors.INFO}
          onPress={() => setShowJoinModal(true)}
        />
        <ActionButton
          icon="add"
          label="Create Server"
          color={Colors.SUCCESS}
          onPress={() => {/* TODO: Create server modal */}}
        />
      </View>

      <FlatList
        data={servers}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderServer}
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
            <Ionicons name="planet-outline" size={64} color={Colors.TEXT_MUTED} />
            <Text style={styles.emptyTitle}>No Servers Yet</Text>
            <Text style={styles.emptyText}>Join or create a server to get started</Text>
          </View>
        }
      />

      {/* Join Server Modal */}
      <JoinServerModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={async (serverId) => {
          await loadServers();
          await handleServerSelect(serverId);
          router.push('/(main)');
        }}
      />

      {/* Invite Modal */}
      {inviteServer && (
        <InviteModal
          visible={!!inviteServer}
          serverId={inviteServer.id}
          serverName={inviteServer.name}
          onClose={() => setInviteServer(null)}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Action Button
// ─────────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

function ActionButton({ icon, label, color, onPress }: ActionButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.95, SpringConfig.MICRO); }}
      onPressOut={() => { scale.value = withSpring(1, SpringConfig.MICRO); }}
      style={styles.actionButtonWrapper}
    >
      <Animated.View style={[styles.actionButton, { borderColor: color }, animatedStyle]}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.actionText, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Server Card
// ─────────────────────────────────────────────────────────────

interface ServerCardProps {
  server: any;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function ServerCard({ server, isSelected, onPress, onLongPress }: ServerCardProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => { scale.value = withSpring(0.98, SpringConfig.MICRO); }}
      onPressOut={() => { scale.value = withSpring(1, SpringConfig.MICRO); }}
    >
      <Animated.View 
        style={[
          styles.serverCard, 
          isSelected && styles.serverCardSelected,
          animatedStyle
        ]}
      >
        <View style={[styles.serverIcon, isSelected && styles.serverIconSelected]}>
          {server.iconUrl ? (
            <Image source={{ uri: server.iconUrl }} style={styles.serverImage} />
          ) : (
            <Text style={styles.serverInitials}>
              {server.name.substring(0, 2).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.serverInfo}>
          <Text style={styles.serverName} numberOfLines={1}>{server.name}</Text>
          <Text style={styles.serverMeta}>
            {server.memberCount || 0} members
          </Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.ACCENT} />
          </View>
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
  actionRow: {
    flexDirection: 'row',
    padding: Spacing.SM,
    gap: Spacing.SM,
  },
  actionButtonWrapper: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.S,
    paddingVertical: Spacing.SM,
    backgroundColor: Colors.SURFACE,
    borderRadius: Radius.M,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  actionText: {
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: Spacing.SM,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.SM,
    backgroundColor: Colors.SURFACE,
    borderRadius: Radius.L,
    marginBottom: Spacing.S,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
  serverCardSelected: {
    borderColor: Colors.ACCENT,
    backgroundColor: Colors.SURFACE_HOVER,
  },
  serverIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.M,
    backgroundColor: Colors.SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.SM,
    overflow: 'hidden',
  },
  serverIconSelected: {
    backgroundColor: Colors.ACCENT,
  },
  serverImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.M,
  },
  serverInitials: {
    color: Colors.TEXT_MUTED,
    fontWeight: '700',
    fontSize: 16,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    color: Colors.TEXT_NORMAL,
    fontWeight: '600',
    fontSize: 16,
  },
  serverMeta: {
    color: Colors.TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  selectedIndicator: {
    marginLeft: Spacing.S,
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
