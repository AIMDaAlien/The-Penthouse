/**
 * LobbyPanel - Main server/channel browser
 * 
 * Discord-style layout:
 * - Server rail on left
 * - Channel list on right
 * - Transparent background (shows BackgroundLayer)
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Pressable, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../designsystem';
import { useServerContext } from '../../context/ServerContext';
import { ServerRail } from '../../components/ServerRail';
import { Panel } from '../../components/Panel';
import CreateServerModal from '../../components/CreateServerModal';
import { DMList } from '../../components/DMList';
import { NewDMModal } from '../../components/NewDMModal';
import CreateChannelModal from '../../components/CreateChannelModal';
import ChannelSettingsModal from '../../components/ChannelSettingsModal';
import { Channel, User } from '../../types';
import SettingsModal from '../../components/SettingsModal';
import { UserPanel } from './UserPanel';

interface LobbyPanelProps {
  onChannelSelect: (channelId: string) => void;
}

export function LobbyPanel({ onChannelSelect }: LobbyPanelProps) {
  const { serverChannels, selectedServerId, handleServerSelect, loadServers, loadServerDetails } = useServerContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Channel Management State
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  const router = useRouter();

  // Mock data helper for demo
  const getMockActiveUsers = (channelId: number): User[] => {
      // Only mock for specific channels for demo purposes (e.g. odd IDs)
      if (channelId % 2 === 0) return []; 
      return [
          { id: 1, username: 'cyber_ninja', avatarUrl: 'https://i.pravatar.cc/150?u=1' },
          { id: 2, username: 'neon_dreamer', avatarUrl: 'https://i.pravatar.cc/150?u=2' },
          { id: 3, username: 'glitch_god', avatarUrl: 'https://i.pravatar.cc/150?u=3' },
          { id: 4, username: 'data_miner', avatarUrl: 'https://i.pravatar.cc/150?u=4' },
          { id: 5, username: 'pixel_artist', avatarUrl: 'https://i.pravatar.cc/150?u=5' },
          { id: 6, username: 'code_wizard', avatarUrl: 'https://i.pravatar.cc/150?u=6' },
      ];
  };

  // Filter channels
  const textChannels = serverChannels.filter(c => c.type !== 'voice');
  const voiceChannels = serverChannels.filter(c => c.type === 'voice').map(c => ({
      ...c,
      activeUsers: c.activeUsers || getMockActiveUsers(c.id)
  }));

  // Filter by search
  const filteredChannels = searchQuery
    ? textChannels.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : textChannels;

  // Load server details when selected
  React.useEffect(() => {
    if (selectedServerId) {
      loadServerDetails(selectedServerId);
    }
  }, [selectedServerId]);

  // Handle server creation success
  const handleServerCreated = (serverId: number, _serverName: string) => {
    setShowCreateServer(false);
    loadServers();
    handleServerSelect(serverId);
  };

  const handleChannelUpdate = () => {
    loadServers(); 
    if (selectedServerId) {
        loadServerDetails(selectedServerId);
    }
  };

  // Handle DM selection - navigate to chat
  const handleSelectDM = (chatId: number) => {
    router.push(`/chat/${chatId}`);
  };

  // Handle new DM created
  const handleDMCreated = (chatId: number) => {
    setShowNewDM(false);
    router.push(`/chat/${chatId}`);
  };

  return (
    <View style={styles.container}>
      {/* User panel at top (full width) */}
      <UserPanel onOpenSettings={() => setShowSettings(true)} />

      <View style={styles.contentRow}>
        {/* Left Rail (Server List) */}
        <View style={styles.rail}>
          <ServerRail onAddServer={() => setShowCreateServer(true)} />
        </View>

        {/* Main Content (Channel List) */}
        <View style={styles.main}>
          {/* Custom Header replacing the Expo header */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>{selectedServerId ? 'Channels' : 'Messages'}</Text>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.searchInner}>
              <Ionicons name="search" size={16} color={Colors.TEXT_MUTED} />
              <TextInput
                placeholder="Find a room..."
                placeholderTextColor={Colors.TEXT_MUTED}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>
          </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedServerId ? (
            <>
              {/* Text Channels Header with Add Button */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>CHANNELS</Text>
                <Pressable onPress={() => setShowCreateChannel(true)} style={styles.addChannelBtn}>
                  <Ionicons name="add" size={16} color={Colors.TEXT_MUTED} />
                </Pressable>
              </View>

              {filteredChannels.map(channel => {
                  const isLocked = channel.allowedRoles && !channel.allowedRoles.includes('role_guest');
                  return (
                    <ChannelRow
                      key={channel.id}
                      name={channel.name}
                      type="text"
                      vibe={channel.vibe} 
                      isLocked={isLocked}
                      hasUnread={(channel.unreadCount || 0) > 0}
                      onPress={() => !isLocked && onChannelSelect(channel.id.toString())}
                      onLongPress={() => setEditingChannel(channel)}
                    />
                  );
              })}

              {/* Voice Channels */}
              {voiceChannels.length > 0 && (
                <>
                  <View style={{ height: Spacing.L }} />
                  <Text style={styles.sectionTitle}>VOICE</Text>
                  {voiceChannels.map(channel => {
                      const isLocked = channel.allowedRoles && !channel.allowedRoles.includes('role_guest');
                      return (
                        <ChannelRow
    
                          key={channel.id}
                          name={channel.name}
                          type="voice"
                          vibe={channel.vibe}
                          activeUsers={channel.activeUsers}
                          disabled={true} // Voice not implemented heavily yet
                          isLocked={isLocked}
                          onPress={() => {}}
                          onLongPress={() => setEditingChannel(channel)}
                        />
                      );
                  })}
                </>
              )}
            </>
          ) : (
            /* Show DM List when no server selected */
            <DMList
              onSelectDM={handleSelectDM}
              onNewDM={() => setShowNewDM(true)}
            />
          )}
        </ScrollView>
      </View>
    </View>

    {/* Modals */}
    <CreateServerModal
        visible={showCreateServer}
        onClose={() => setShowCreateServer(false)}
        onCreated={handleServerCreated}
      />

      <CreateChannelModal
        visible={showCreateChannel}
        serverId={selectedServerId || 0}
        onClose={() => setShowCreateChannel(false)}
        onCreated={handleChannelUpdate}
      />

      <ChannelSettingsModal
        visible={!!editingChannel}
        channel={editingChannel}
        onClose={() => setEditingChannel(null)}
        onUpdate={handleChannelUpdate}
      />

      <NewDMModal
        visible={showNewDM}
        onClose={() => setShowNewDM(false)}
        onDMCreated={handleDMCreated}
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Channel Row Component
// ─────────────────────────────────────────────────────────────

interface ChannelRowProps {
  name: string;
  type: 'text' | 'voice';
  vibe?: string;
  activeUsers?: User[];
  disabled?: boolean;
  isLocked?: boolean;
  hasUnread?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

function ChannelRow({ name, type, vibe, activeUsers, disabled, isLocked, hasUnread, onPress, onLongPress }: ChannelRowProps) {
  // Vibe coloring
  const getVibeColor = (v: string | undefined) => {
    switch(v) {
      case 'chill': return '#6bf';
      case 'hype': return '#f0f';
      case 'serious': return '#888';
      default: return Colors.CHANNEL_DEFAULT;
    }
  };

  const vibeColor = getVibeColor(vibe);
  const isVibing = vibe && vibe !== 'default';

  return (
    <Pressable
      onPress={isLocked ? () => {} : onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
      disabled={disabled}
      style={({ pressed }) => [
        styles.channelRow,
        pressed && !isLocked && styles.channelRowPressed,
        (disabled || isLocked) && styles.channelRowDisabled,
        isVibing && !isLocked && { 
            backgroundColor: vibeColor + '10', // 10% opacity bg
            borderLeftWidth: 2,
            borderLeftColor: vibeColor 
        },
        activeUsers && activeUsers.length > 0 && { paddingBottom: Spacing.M }
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {hasUnread && !isLocked && <View style={styles.unreadPill} />}
        <View style={styles.channelIcon}>
            {isLocked ? (
                <Ionicons name="lock-closed" size={14} color={Colors.TEXT_MUTED} />
            ) : type === 'text' ? (
                <Text style={[styles.hashIcon, isVibing && { color: vibeColor }]}>#</Text>
            ) : (
                <Ionicons name="mic" size={16} color={isVibing ? vibeColor : Colors.INTERACTIVE_NORMAL} />
            )}
        </View>
        <Text 
          style={[
            styles.channelName,
            hasUnread && !isLocked && styles.channelNameUnread,
            isVibing && !isLocked && { color: vibeColor, fontWeight: '600' },
            isLocked && { color: Colors.TEXT_MUTED }
          ]}
        >
          {name}
        </Text>
      </View>

      {/* Active Users Preview */}
      {activeUsers && activeUsers.length > 0 && !isLocked && (
          <View style={styles.activeUsersContainer}>
              {activeUsers.slice(0, 5).map((user, index) => (
                  <View key={user.id} style={[styles.userAvatar, { marginLeft: index > 0 ? -8 : 0, zIndex: 10 - index }]}>
                      <Image 
                        source={{ uri: user.avatarUrl }} 
                        style={styles.avatarImg} 
                      />
                  </View>
              ))}
              {activeUsers.length > 5 && (
                  <View style={[styles.userAvatar, styles.moreUsers, { marginLeft: -8, zIndex: 0 }]}>
                      <Text style={styles.moreUsersText}>+{activeUsers.length - 5}</Text>
                  </View>
              )}
          </View>
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Colors.BASE,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  rail: {
    backgroundColor: Colors.BASE,
  },
  main: {
    flex: 1,
    backgroundColor: Colors.SECONDARY,
    borderTopLeftRadius: Radius.L,
    overflow: 'hidden',
  },
  headerContainer: {
    paddingHorizontal: Spacing.M,
    paddingTop: Spacing.M,
    paddingBottom: Spacing.S,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.H2,
    fontSize: 16,
    color: Colors.TEXT_NORMAL,
    fontWeight: '600',
  },
  searchContainer: {
    marginHorizontal: Spacing.SM,
    marginTop: Spacing.SM,
    marginBottom: Spacing.M,
    borderRadius: Radius.S,
    overflow: 'hidden',
    backgroundColor: Colors.EFFECTS.INPUT_BG,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.SM,
    paddingVertical: Spacing.S,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.S,
    color: Colors.TEXT_NORMAL,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: Spacing.S,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.XS,
    marginTop: Spacing.M,
    paddingRight: Spacing.XS,
  },
  sectionTitle: {
    ...Typography.OVERLINE,
    color: Colors.TEXT_MUTED,
    marginLeft: Spacing.S,
  },
  addChannelBtn: {
    padding: 4,
  },
  channelRow: {
    // flexDirection: 'column', // Changed to column to stack users below name
    paddingVertical: Spacing.S,
    paddingHorizontal: Spacing.SM,
    borderRadius: Radius.S,
    marginBottom: 2,
    justifyContent: 'center',
  },
  activeUsersContainer: {
      flexDirection: 'row',
      marginTop: Spacing.S,
      marginLeft: 32,
  },
  userAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: Colors.SECONDARY,
      backgroundColor: Colors.SURFACE0,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
  },
  avatarImg: {
      width: '100%',
      height: '100%',
  },
  moreUsers: {
      backgroundColor: Colors.SURFACE2,
  },
  moreUsersText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: Colors.TEXT_NORMAL,
  },
  channelRowPressed: {
    backgroundColor: Colors.SURFACE_HOVER,
  },
  channelRowDisabled: {
    opacity: 0.5,
  },
  channelIcon: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.S,
  },
  hashIcon: {
    color: Colors.INTERACTIVE_NORMAL,
    fontSize: 18,
    fontWeight: '500',
  },
  channelName: {
    ...Typography.CHANNEL,
    color: Colors.CHANNEL_DEFAULT,
  },
  channelNameUnread: {
    color: Colors.TEXT_NORMAL,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.XXXL,
    opacity: 0.7,
  },
  emptyText: {
    ...Typography.BODY,
    color: Colors.TEXT_MUTED,
    marginTop: Spacing.M,
    textAlign: 'center',
  },
  unreadPill: {
    width: 4,
    height: 8,
    borderRadius: Radius.PILL,
    backgroundColor: Colors.TEXT_NORMAL,
    position: 'absolute',
    left: 4,
  },
});
