/**
 * BackgroundLayer - Full-screen wallpaper with premium overlay
 * 
 * ClearVision-inspired design:
 * - Full-screen background image (user-uploadable in future)
 * - Multi-layer gradient vignette
 * - Subtle accent tint for cohesion
 * - Blur effect for iOS
 */

import React from 'react';
import { StyleSheet, View, Image, Dimensions, Platform, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../designsystem';

const { width, height } = Dimensions.get('window');

// Default background - moody penthouse at night
const DEFAULT_BG = require('../../assets/penthouse-bg.png');

interface BackgroundLayerProps {
  /** Custom background image source (for user uploads) */
  source?: ImageSourcePropType;
  /** Blur intensity (0-100) */
  blurIntensity?: number;
  /** Tint opacity (0-1) */
  tintOpacity?: number;
}

export function BackgroundLayer({ 
  source = DEFAULT_BG,
  blurIntensity = 30,
  tintOpacity = 0.05,
}: BackgroundLayerProps) {
  return (
    <View style={styles.container}>
      {/* 1. Base Image */}
      <Image 
        source={source} 
        style={styles.image} 
        resizeMode="cover"
        blurRadius={Platform.OS === 'android' ? 8 : (Platform.OS === 'web' ? 12 : 0)}
      />
      
      {/* 2. Blur Layer (iOS quality blur) */}
      {Platform.OS === 'ios' && blurIntensity > 0 && (
        <BlurView 
          intensity={blurIntensity} 
          style={StyleSheet.absoluteFill} 
          tint="dark" 
        />
      )}

      {/* 3. Dark overlay for text readability */}
      <View style={styles.darkOverlay} />

      {/* 4. Horizontal Gradient Vignette */}
      <LinearGradient
        colors={[Colors.TERTIARY, 'transparent', 'transparent', Colors.TERTIARY]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        locations={[0, 0.2, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* 5. Vertical Gradient Vignette */}
      <LinearGradient
        colors={[Colors.TERTIARY, 'transparent', 'transparent', Colors.TERTIARY]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.12, 0.88, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 6. Accent Tint (muted periwinkle) */}
      <View style={[styles.tint, { opacity: tintOpacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    backgroundColor: Colors.TERTIARY,
  },
  image: {
    width: width,
    height: height + 50, // Slight overscan for parallax
    position: 'absolute',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.TERTIARY,
    opacity: 0.5,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.ACCENT,
  },
});

export default BackgroundLayer;
