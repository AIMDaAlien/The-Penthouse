/**
 * MessageRow - Discord-style flat message layout
 * 
 * Features:
 * - Avatar + username + timestamp header
 * - Message content with markdown support
 * - Hover/press states
 * - Reply indicator
 * - Reactions bar (future)
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { Avatar } from './Avatar';
import { Colors, Typography, Spacing, SpringConfig } from '../designsystem';

interface MessageRowProps {
  /** Message ID */
  id: string;
  /** Sender info */
  sender: {
    id: string;
    username: string;
    avatar?: string;
    status?: 'online' | 'idle' | 'dnd' | 'offline';
  };
  /** Message content */
  content: string;
  /** Timestamp (ISO string) */
  timestamp: string;
  /** Is this a reply to another message? */
  replyTo?: {
    username: string;
    content: string;
  };
  /** Is the message from the current user? */
  isOwnMessage?: boolean;
  /** Is the message part of a group (same sender, close time)? */
  isGrouped?: boolean;
  /** Is this message being edited? */
  isEditing?: boolean;
  /** Callback when message is pressed */
  onPress?: () => void;
  /** Callback for long press (context menu) */
  onLongPress?: () => void;
  /** Additional styles */
  style?: ViewStyle;
}

export function MessageRow({
  id,
  sender,
  content,
  timestamp,
  replyTo,
  isOwnMessage = false,
  isGrouped = false,
  isEditing = false,
  onPress,
  onLongPress,
  style,
}: MessageRowProps) {
  const pressed = useSharedValue(0);
  
  const animatedBg = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255, 255, 255, ${pressed.value * 0.03})`,
  }));

  const handlePressIn = () => {
    pressed.value = withSpring(1, SpringConfig.MICRO);
  };

  const handlePressOut = () => {
    pressed.value = withSpring(0, SpringConfig.MICRO);
  };

  // Format timestamp
  const formattedTime = formatTimestamp(timestamp);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={300}
    >
      <Animated.View style={[styles.container, animatedBg, style]}>
        {/* Reply indicator */}
        {replyTo && (
          <View style={styles.replyContainer}>
            <View style={styles.replyLine} />
            <Text style={styles.replyText} numberOfLines={1}>
              <Text style={styles.replyUsername}>@{replyTo.username}</Text>
              {' '}{replyTo.content}
            </Text>
          </View>
        )}

        {/* Main message row */}
        <View style={styles.messageRow}>
          {/* Avatar (hidden for grouped messages) */}
          <View style={styles.avatarColumn}>
            {!isGrouped ? (
              <Avatar
                source={sender.avatar}
                size="medium"
                status={sender.status}
                showStatus={false}
              />
            ) : (
              // Show timestamp on hover for grouped messages
              <Text style={styles.groupedTimestamp}>{formattedTime}</Text>
            )}
          </View>

          {/* Content */}
          <View style={styles.contentColumn}>
            {/* Header (hidden for grouped messages) */}
            {!isGrouped && (
              <View style={styles.header}>
                <Text 
                  style={[
                    styles.username,
                    isOwnMessage && styles.ownUsername
                  ]}
                >
                  {sender.username}
                </Text>
                <Text style={styles.timestamp}>{formattedTime}</Text>
              </View>
            )}

            {/* Message content */}
            <Text 
              style={[
                styles.content,
                isEditing && styles.editingContent
              ]}
              selectable
            >
              {content}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  
  if (hours < 24) {
    // Today - show time only
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } else if (hours < 48) {
    // Yesterday
    return 'Yesterday';
  } else {
    // Show date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.M,
    paddingVertical: Spacing.XS,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 56, // Avatar width + gap
    marginBottom: Spacing.XS,
  },
  replyLine: {
    width: 2,
    height: 12,
    backgroundColor: Colors.INTERACTIVE_MUTED,
    borderRadius: 1,
    marginRight: Spacing.S,
  },
  replyText: {
    ...Typography.CAPTION,
    color: Colors.TEXT_MUTED,
    flex: 1,
  },
  replyUsername: {
    color: Colors.TEXT_LINK,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
  },
  avatarColumn: {
    width: 40,
    marginRight: Spacing.SM,
    alignItems: 'center',
  },
  groupedTimestamp: {
    ...Typography.TIMESTAMP,
    opacity: 0, // Hidden by default, show on hover (mobile: always hidden)
  },
  contentColumn: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  username: {
    ...Typography.USERNAME,
    marginRight: Spacing.S,
  },
  ownUsername: {
    color: Colors.ACCENT_LIGHT,
  },
  timestamp: {
    ...Typography.TIMESTAMP,
  },
  content: {
    ...Typography.BODY,
    lineHeight: 22,
  },
  editingContent: {
    backgroundColor: Colors.SURFACE,
    borderRadius: 4,
    padding: Spacing.XS,
  },
});

export default MessageRow;
