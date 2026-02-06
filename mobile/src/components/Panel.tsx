/**
 * Panel - Translucent card container with blur
 * 
 * ClearVision-inspired design:
 * - Semi-transparent background
 * - Backdrop blur effect
 * - Subtle border
 * - Configurable elevation
 */

import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Radius, Spacing, Shadows } from '../designsystem';

type PanelVariant = 'default' | 'elevated' | 'flat';

interface PanelProps extends ViewProps {
  /** Visual variant */
  variant?: PanelVariant;
  /** Border radius */
  radius?: keyof typeof Radius;
  /** Padding inside panel */
  padding?: keyof typeof Spacing;
  /** Blur intensity (0 = no blur) */
  blurIntensity?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Children */
  children?: React.ReactNode;
}

export function Panel({
  variant = 'default',
  radius = 'M',
  padding = 'M',
  blurIntensity = 20,
  style,
  children,
  ...props
}: PanelProps) {
  const borderRadius = Radius[radius];
  const paddingValue = Spacing[padding];
  
  const shadowStyle = variant === 'elevated' ? Shadows.CARD : Shadows.NONE;
  
  return (
    <View
      style={[
        styles.container,
        shadowStyle,
        { borderRadius },
        style,
      ]}
      {...props}
    >
      {/* Blur backdrop */}
      {blurIntensity > 0 && (
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
      )}
      
      {/* Background with transparency */}
      <View 
        style={[
          styles.background, 
          { 
            borderRadius,
            backgroundColor: variant === 'flat' 
              ? Colors.SURFACE 
              : Colors.EFFECTS.PANEL_BG,
          }
        ]} 
      />
      
      {/* Border */}
      <View 
        style={[
          styles.border, 
          { borderRadius }
        ]} 
      />
      
      {/* Content */}
      <View style={{ padding: paddingValue }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
});

export default Panel;
