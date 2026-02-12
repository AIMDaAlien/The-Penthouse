/**
 * LobbyPanel - Main server/channel browser
 * 
 * Discord-style layout:
 * - Server rail on left
 * - Channel list on right
 * - Transparent background (shows BackgroundLayer)
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../designsystem';
import { useServerContext } from '../../context/ServerContext';
import { ServerRail } from '../../components/ServerRail';
import { Panel } from '../../components/Panel';
import CreateServerModal from '../../components/CreateServerModal';
import { DMList } from '../../components/DMList';
import { NewDMModal } from '../../components/NewDMModal';

interface LobbyPanelProps {
  onChannelSelect: (channelId: string) => void;
}

export function LobbyPanel({ onChannelSelect }: LobbyPanelProps) {
  const { serverChannels, selectedServerId, handleServerSelect, loadServers } = useServerContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const router = useRouter();

  // Filter channels
  const textChannels = serverChannels.filter(c => c.type !== 'voice');
  const voiceChannels = serverChannels.filter(c => c.type === 'voice');

  // Filter by search
  const filteredChannels = searchQuery
    ? textChannels.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : textChannels;

  // Handle server creation success
  const handleServerCreated = (serverId: number, _serverName: string) => {
    setShowCreateServer(false);
    loadServers();
    handleServerSelect(serverId);
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
      {/* Left Rail (Server List) */}
      <View style={styles.rail}>
        <ServerRail onAddServer={() => setShowCreateServer(true)} />
      </View>

      {/* Main Content (Channel List) */}
      <View style={styles.main}>
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
              {/* Text Channels */}
              <Text style={styles.sectionTitle}>CHANNELS</Text>
              {filteredChannels.map(channel => (
                <ChannelRow
                  key={channel.id}
                  name={channel.name}
                  type="text"
                  hasUnread={(channel.unreadCount || 0) > 0}
                  onPress={() => onChannelSelect(channel.id.toString())}
                />
              ))}

              {/* Voice Channels */}
              {voiceChannels.length > 0 && (
                <>
                  <View style={{ height: Spacing.L }} />
                  <Text style={styles.sectionTitle}>VOICE</Text>
                  {voiceChannels.map(channel => (
                    <ChannelRow
                      key={channel.id}
                      name={channel.name}
                      type="voice"
                      disabled
                      onPress={() => {}}
                    />
                  ))}
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

      {/* Create Server Modal */}
      <CreateServerModal
        visible={showCreateServer}
        onClose={() => setShowCreateServer(false)}
        onCreated={handleServerCreated}
      />

      {/* New DM Modal */}
      <NewDMModal
        visible={showNewDM}
        onClose={() => setShowNewDM(false)}
        onDMCreated={handleDMCreated}
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
  disabled?: boolean;
  hasUnread?: boolean;
  onPress: () => void;
}

function ChannelRow({ name, type, disabled, hasUnread, onPress }: ChannelRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.channelRow,
        pressed && styles.channelRowPressed,
        disabled && styles.channelRowDisabled,
      ]}
    >
      {hasUnread && <View style={styles.unreadPill} />}
      <View style={styles.channelIcon}>
        {type === 'text' ? (
          <Text style={styles.hashIcon}>#</Text>
        ) : (
          <Ionicons name="mic" size={16} color={Colors.INTERACTIVE_NORMAL} />
        )}
      </View>
      <Text 
        style={[
          styles.channelName,
          hasUnread && styles.channelNameUnread,
        ]}
      >
        {name}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.BASE, // Fill behind the rounded corner
  },
  rail: {
    backgroundColor: Colors.BASE, // Match the background to prevent white space
  },
  main: {
    flex: 1,
    backgroundColor: Colors.SECONDARY, // Dark but slightly lighter than rail
    borderTopLeftRadius: Radius.L,
    overflow: 'hidden',
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
    paddingHorizontal: Spacing.SM,
    paddingBottom: 100,
  },
  sectionTitle: {
    ...Typography.OVERLINE,
    color: Colors.TEXT_MUTED,
    marginBottom: Spacing.XS,
    marginLeft: Spacing.S,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.S,
    paddingHorizontal: Spacing.SM,
    borderRadius: Radius.S,
    marginBottom: 2,
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
