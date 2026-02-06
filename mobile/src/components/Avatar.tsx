/**
 * Avatar - User avatar with status indicator
 * 
 * Discord-style design:
 * - Circular avatar image
 * - Status dot overlay (online/idle/dnd/offline)
 * - Configurable sizes
 */

import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { Colors, Sizes, Radius } from '../designsystem';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';
type StatusType = 'online' | 'idle' | 'dnd' | 'offline' | 'streaming' | null;

interface AvatarProps {
  /** Image source */
  source?: ImageSourcePropType | string;
  /** Size variant */
  size?: AvatarSize;
  /** User status */
  status?: StatusType;
  /** Show status indicator */
  showStatus?: boolean;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  small: Sizes.AVATAR_MEMBER,    // 32
  medium: Sizes.AVATAR_MESSAGE,  // 40
  large: 56,
  xlarge: Sizes.AVATAR_LARGE,    // 80
};

const STATUS_SIZE_MAP: Record<AvatarSize, number> = {
  small: 10,
  medium: 12,
  large: 14,
  xlarge: 18,
};

const STATUS_COLORS: Record<NonNullable<StatusType>, string> = {
  online: Colors.ONLINE,
  idle: Colors.IDLE,
  dnd: Colors.DND,
  offline: Colors.OFFLINE,
  streaming: Colors.STREAMING,
};

// Default avatar placeholder
const DEFAULT_AVATAR = require('../../assets/adaptive-icon.png');

export function Avatar({
  source,
  size = 'medium',
  status = null,
  showStatus = true,
}: AvatarProps) {
  const avatarSize = SIZE_MAP[size];
  const statusSize = STATUS_SIZE_MAP[size];
  
  // Handle string URLs or ImageSourcePropType
  const imageSource: ImageSourcePropType = 
    typeof source === 'string' 
      ? { uri: source } 
      : source || DEFAULT_AVATAR;

  return (
    <View style={[styles.container, { width: avatarSize, height: avatarSize }]}>
      {/* Avatar image */}
      <Image
        source={imageSource}
        style={[
          styles.image,
          { 
            width: avatarSize, 
            height: avatarSize, 
            borderRadius: avatarSize / 2 
          }
        ]}
        resizeMode="cover"
      />
      
      {/* Status indicator */}
      {showStatus && status && (
        <View
          style={[
            styles.statusDot,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              backgroundColor: STATUS_COLORS[status],
              // Position at bottom-right
              bottom: 0,
              right: 0,
              borderWidth: size === 'small' ? 2 : 3,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: Colors.SURFACE,
  },
  statusDot: {
    position: 'absolute',
    borderColor: Colors.TERTIARY,
  },
});

export default Avatar;
