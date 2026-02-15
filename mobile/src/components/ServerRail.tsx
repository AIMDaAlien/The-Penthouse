/**
 * ServerRail - Discord-style server navigation column
 * 
 * Features:
 * - Morphing circle → squircle on selection
 * - Glow effect on active server
 * - Active pill indicator
 * - Home button, divider, server list, add button
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Sizes, SpringConfig, Glows } from '../designsystem';
import { useServerContext } from '../context/ServerContext';
import { getMediaUrl } from '../services/api';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ServerRailProps {
  onAddServer?: () => void;
}

interface ServerButtonProps {
  server: any;
  isSelected: boolean;
  hasUnread?: boolean;
  onPress: () => void;
}

// ─────────────────────────────────────────────────────────────
// Server Button with Morph + Glow
// ─────────────────────────────────────────────────────────────

const ServerButton = React.memo(function ServerButton({ server, isSelected, hasUnread, onPress }: ServerButtonProps) {
  const morph = useSharedValue(isSelected ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    morph.value = withSpring(isSelected ? 1 : 0, SpringConfig.MORPH);
  }, [isSelected]);

  const animatedContainer = useAnimatedStyle(() => ({
    borderRadius: interpolate(morph.value, [0, 1], [24, 16]),
    transform: [{ scale: scale.value }],
  }));

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0, 1], [0, 1]),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, SpringConfig.MICRO);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfig.MICRO);
  };

  return (
    <View style={styles.buttonWrapper}>
      {/* Active pill indicator */}
      <Animated.View 
        style={[
          styles.activePill,
          {
            height: isSelected ? 36 : hasUnread ? 8 : 0,
            opacity: isSelected || hasUnread ? 1 : 0,
          }
        ]} 
      />
      
      {/* Server button with glow */}
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Glow layer */}
        <Animated.View style={[styles.glowLayer, animatedGlow]} />
        
        <Animated.View 
          style={[
            styles.serverBtn,
            animatedContainer,
            isSelected && styles.serverBtnSelected,
          ]}
        >
          {server.iconUrl ? (
            <Image 
              source={{ uri: getMediaUrl(server.iconUrl) }} 
              style={styles.icon} 
            />
          ) : (
            <Text style={[
              styles.initials,
              isSelected && { color: Colors.TERTIARY }
            ]}>
              {server.name.substring(0, 2).toUpperCase()}
            </Text>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// Home Button
// ─────────────────────────────────────────────────────────────

interface HomeButtonProps {
  isSelected: boolean;
  onPress: () => void;
}

const HomeButton = React.memo(function HomeButton({ isSelected, onPress }: HomeButtonProps) {
  const morph = useSharedValue(isSelected ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    morph.value = withSpring(isSelected ? 1 : 0, SpringConfig.MORPH);
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(morph.value, [0, 1], [24, 16]),
    transform: [{ scale: scale.value }],
    backgroundColor: isSelected ? Colors.ACCENT : Colors.EFFECTS.CARD_BG,
  }));

  return (
    <View style={styles.buttonWrapper}>
      <Animated.View 
        style={[
          styles.activePill,
          { height: isSelected ? 36 : 0, opacity: isSelected ? 1 : 0 }
        ]} 
      />
      
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, SpringConfig.MICRO); }}
        onPressOut={() => { scale.value = withSpring(1, SpringConfig.MICRO); }}
      >
        <Animated.View style={[styles.serverBtn, animatedStyle]}>
          <Ionicons 
            name="chatbubbles" 
            size={24} 
            color={isSelected ? Colors.TERTIARY : Colors.INTERACTIVE_NORMAL} 
          />
        </Animated.View>
      </Pressable>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function ServerRail({ onAddServer }: ServerRailProps) {
  const { servers, selectedServerId, handleServerSelect } = useServerContext();

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Home / DMs */}
      <HomeButton 
        isSelected={selectedServerId === 0}
        onPress={() => handleServerSelect(0)}
      />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Server List */}
      {servers.map(server => (
        <ServerButton 
          key={server.id} 
          server={server} 
          isSelected={server.id === selectedServerId}
          hasUnread={(server.unreadCount || 0) > 0} 
          onPress={() => handleServerSelect(server.id)}
        />
      ))}

      {/* Add Server */}
      <Pressable 
        onPress={onAddServer}
        style={[styles.serverBtn, styles.addBtn]}
      >
        <Ionicons name="add" size={24} color={Colors.SUCCESS} />
      </Pressable>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: Sizes.SERVER_RAIL_WIDTH,
    backgroundColor: Colors.TERTIARY,
  },
  content: {
    alignItems: 'center',
    paddingVertical: Spacing.L,
    paddingBottom: Spacing.XXXL,
  },
  buttonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.S,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    left: 0,
    width: 4,
    backgroundColor: Colors.ACCENT_LIGHT,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  glowLayer: {
    position: 'absolute',
    top: -4,
    left: 8, // Account for pill
    width: Sizes.SERVER_ICON + 8,
    height: Sizes.SERVER_ICON + 8,
    borderRadius: 20,
    ...Glows.SELECTED,
  },
  serverBtn: {
    width: Sizes.SERVER_ICON,
    height: Sizes.SERVER_ICON,
    borderRadius: 24,
    backgroundColor: Colors.EFFECTS.CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.SM,
    overflow: 'hidden',
  },
  serverBtnSelected: {
    backgroundColor: Colors.ACCENT,
  },
  icon: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  initials: {
    color: Colors.TEXT_NORMAL,
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    width: 32,
    height: 2,
    backgroundColor: Colors.EFFECTS.PANEL_BORDER,
    marginVertical: Spacing.M,
    borderRadius: 1,
  },
  addBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.SUCCESS,
    backgroundColor: 'transparent',
    marginTop: Spacing.S,
  },
});

export default ServerRail;
