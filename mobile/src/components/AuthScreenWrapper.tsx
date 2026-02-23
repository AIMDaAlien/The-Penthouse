/**
 * AuthScreenWrapper — Shared shell for all auth screens (login, register, forgot-password).
 * Provides the periwinkle background with layered radial gradients at varying opacities
 * that blend smoothly into the background — no moving parts, just organic depth.
 *
 * Animation: web parallax tilt only (mouse-driven, spring-based). No orbs, no drift.
 *
 * Performance notes:
 *   - Only transform + opacity animated (GPU-composited, no layout recalc)
 *   - Gradients are static CSS / RN Views — zero per-frame cost
 *   - Parallax tilt is web-only (no gyroscope dep, saves battery on native)
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const PERIWINKLE = '#8382C9';

const DismissKeyboardView = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') return <View style={{ flex: 1 }}>{children}</View>;
  return <TouchableWithoutFeedback onPress={Keyboard.dismiss}>{children}</TouchableWithoutFeedback>;
};

interface AuthScreenWrapperProps {
  children: React.ReactNode;
  /** If true, content will be vertically centered (for forgot-password). Default: space-between (login/register). */
  centered?: boolean;
}

export function AuthScreenWrapper({ children, centered = false }: AuthScreenWrapperProps) {
  // ─── Web parallax tilt (spring-based) ───
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const contentShiftX = useSharedValue(0);
  const contentShiftY = useSharedValue(0);
  const phoneRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;

      tiltX.value = withSpring(-dy * 4, { damping: 20, stiffness: 150 });
      tiltY.value = withSpring(dx * 4, { damping: 20, stiffness: 150 });
      contentShiftX.value = withSpring(-dx * 8, { damping: 20, stiffness: 150 });
      contentShiftY.value = withSpring(-dy * 8, { damping: 20, stiffness: 150 });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const phoneParallaxStyle = useAnimatedStyle(() => {
    if (Platform.OS !== 'web') return {};
    return {
      transform: [
        { perspective: 1200 },
        { rotateX: `${tiltX.value}deg` },
        { rotateY: `${tiltY.value}deg` },
      ],
    } as any;
  });

  const contentParallaxStyle = useAnimatedStyle(() => {
    if (Platform.OS !== 'web') return {};
    return {
      transform: [
        { translateX: contentShiftX.value },
        { translateY: contentShiftY.value },
      ],
    };
  });

  return (
    <View style={styles.outerContainer}>
      <Animated.View ref={phoneRef} style={[styles.phoneContainer, phoneParallaxStyle]}>
        {/* ═══ Layered gradient backdrop ═══ */}
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
          {/* Base: subtle light wash from top-left */}
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Mid: soft warm highlight from bottom-right */}
          <LinearGradient
            colors={['transparent', 'rgba(180, 170, 220, 0.10)']}
            start={{ x: 0.2, y: 0.3 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Depth: dark vignette from edges to center — reduces brightness evenly */}
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.30)', 'transparent', 'rgba(26, 26, 26, 0.30)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Accent: faint diagonal streak for organic feel */}
          <View style={styles.gradientBlob1} />
          <View style={styles.gradientBlob2} />
          <View style={styles.gradientBlob3} />
        </View>

        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <DismissKeyboardView>
              <ScrollView
                contentContainerStyle={[
                  styles.scrollContent,
                  centered && { justifyContent: 'center' },
                ]}
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                <Animated.View style={[contentParallaxStyle, !centered && styles.contentSpaceBetween]}>
                  {children}
                </Animated.View>
              </ScrollView>
            </DismissKeyboardView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  phoneContainer: {
    flex: 1,
    backgroundColor: 'rgba(131, 130, 201, 0.75)',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : undefined,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 200px 80px rgba(131, 130, 201, 0.5)' }
      : {}),
  } as any,
  scrollView: {
    flex: 1,
    paddingHorizontal: 35,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 50,
    paddingBottom: 40,
  },
  contentSpaceBetween: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // ─── Static gradient blobs — radial spots at varying opacities ───
  gradientBlob1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: '5%',
    left: '-15%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    ...(Platform.OS === 'web'
      ? { filter: 'blur(60px)' }
      : { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.06, shadowRadius: 60 }),
  } as any,
  gradientBlob2: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    bottom: '10%',
    right: '-20%',
    backgroundColor: 'rgba(200, 190, 240, 0.05)',
    ...(Platform.OS === 'web'
      ? { filter: 'blur(80px)' }
      : { shadowColor: '#c8bef0', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.05, shadowRadius: 80 }),
  } as any,
  gradientBlob3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: '40%',
    left: '25%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    ...(Platform.OS === 'web'
      ? { filter: 'blur(50px)' }
      : { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.04, shadowRadius: 50 }),
  } as any,
});

export default AuthScreenWrapper;
