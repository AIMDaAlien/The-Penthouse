/**
 * AuthScreenWrapper — Shared shell for all auth screens (login, register, forgot-password).
 * Provides the POC 3 aesthetic: periwinkle background, animated white glow orbs,
 * dark grey overlay, mobile-width container on web, and overflow clipping.
 *
 * Animation system (two-phase):
 *   Phase 1 — Cinematic entrance: orbs fade in after 1.5s delay
 *   Phase 2 — Ambient motion: orbs breathe (spring-based scale) + web parallax tilt
 *
 * Performance notes (Pixel 4a baseline):
 *   - Only transform + opacity animated (GPU-composited, no layout recalc)
 *   - filter: blur() is static only, never animated
 *   - Parallax tilt is web-only (no gyroscope dep, saves battery on native)
 *   - Entrance springs complete and stop — no ongoing CPU cost
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

const PERIWINKLE = '#8382C9';
const DARK_OVERLAY_COLOR = '#1a1a1a';
const DARK_OVERLAY_OPACITY = 0.25;

// Project-mandated spring config (dampingRatio ≈ 0.8, stiffness ≈ 300)
const EXPRESSIVE_SPRING = { damping: 15, stiffness: 120, mass: 1 };

// Slower, gentler spring for breathing orbs
const BREATHING_SPRING = { damping: 14, stiffness: 8, mass: 1.5 };

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
  // ─── Orb entrance (Phase 1): fade in after cinematic reveal ───
  const orb1Opacity = useSharedValue(0);
  const orb2Opacity = useSharedValue(0);
  const orb3Opacity = useSharedValue(0);

  // ─── Orb breathing (Phase 2): spring-based scale pulse ───
  const orb1Scale = useSharedValue(1);
  const orb2Scale = useSharedValue(1);
  const orb3Scale = useSharedValue(1);

  // ─── Orb drift (Phase 2): slow position oscillation ───
  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);
  const orb3X = useSharedValue(0);
  const orb3Y = useSharedValue(0);

  // ─── Web parallax tilt ───
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const contentShiftX = useSharedValue(0);
  const contentShiftY = useSharedValue(0);
  const phoneRef = useRef<View>(null);

  useEffect(() => {
    // Phase 1: Orbs fade in after cinematic entrance completes (~1.5s)
    const ORB_ENTRANCE_DELAY = 1500;
    orb1Opacity.value = withDelay(ORB_ENTRANCE_DELAY, withSpring(0.35, EXPRESSIVE_SPRING));
    orb2Opacity.value = withDelay(ORB_ENTRANCE_DELAY + 300, withSpring(0.25, EXPRESSIVE_SPRING));
    orb3Opacity.value = withDelay(ORB_ENTRANCE_DELAY + 600, withSpring(0.2, EXPRESSIVE_SPRING));

    // Phase 2: Breathing — spring-based scale oscillation (starts after orbs appear)
    const BREATHING_DELAY = ORB_ENTRANCE_DELAY + 1000;
    orb1Scale.value = withDelay(BREATHING_DELAY,
      withRepeat(withSequence(
        withSpring(1.15, BREATHING_SPRING),
        withSpring(1.0, BREATHING_SPRING),
      ), -1, false)
    );
    orb2Scale.value = withDelay(BREATHING_DELAY + 500,
      withRepeat(withSequence(
        withSpring(1.2, BREATHING_SPRING),
        withSpring(0.9, BREATHING_SPRING),
      ), -1, false)
    );
    orb3Scale.value = withDelay(BREATHING_DELAY + 1000,
      withRepeat(withSequence(
        withSpring(1.25, BREATHING_SPRING),
        withSpring(0.95, BREATHING_SPRING),
      ), -1, false)
    );

    // Phase 2: Slow drift — spring-based position oscillation
    orb1X.value = withDelay(BREATHING_DELAY,
      withRepeat(withSequence(
        withSpring(30, BREATHING_SPRING),
        withSpring(-15, BREATHING_SPRING),
      ), -1, false)
    );
    orb1Y.value = withDelay(BREATHING_DELAY,
      withRepeat(withSequence(
        withSpring(40, BREATHING_SPRING),
        withSpring(-20, BREATHING_SPRING),
      ), -1, false)
    );
    orb2X.value = withDelay(BREATHING_DELAY + 500,
      withRepeat(withSequence(
        withSpring(-40, BREATHING_SPRING),
        withSpring(20, BREATHING_SPRING),
      ), -1, false)
    );
    orb2Y.value = withDelay(BREATHING_DELAY + 500,
      withRepeat(withSequence(
        withSpring(-30, BREATHING_SPRING),
        withSpring(15, BREATHING_SPRING),
      ), -1, false)
    );
    orb3X.value = withDelay(BREATHING_DELAY + 1000,
      withRepeat(withSequence(
        withSpring(25, BREATHING_SPRING),
        withSpring(-25, BREATHING_SPRING),
      ), -1, false)
    );
    orb3Y.value = withDelay(BREATHING_DELAY + 1000,
      withRepeat(withSequence(
        withSpring(-20, BREATHING_SPRING),
        withSpring(20, BREATHING_SPRING),
      ), -1, false)
    );
  }, []);

  // ─── Web parallax: mousemove handler ───
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;  // -1 to 1
      const dy = (e.clientY - cy) / cy;  // -1 to 1

      // Subtle tilt (max ±4deg) — spring-based for smooth feel
      tiltX.value = withSpring(-dy * 4, { damping: 20, stiffness: 150 });
      tiltY.value = withSpring(dx * 4, { damping: 20, stiffness: 150 });

      // Content counter-shift (max ±8px)
      contentShiftX.value = withSpring(-dx * 8, { damping: 20, stiffness: 150 });
      contentShiftY.value = withSpring(-dy * 8, { damping: 20, stiffness: 150 });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ─── Animated styles ───
  const orb1Style = useAnimatedStyle(() => ({
    opacity: orb1Opacity.value,
    transform: [
      { translateX: orb1X.value },
      { translateY: orb1Y.value },
      { scale: orb1Scale.value },
    ],
  }));
  const orb2Style = useAnimatedStyle(() => ({
    opacity: orb2Opacity.value,
    transform: [
      { translateX: orb2X.value },
      { translateY: orb2Y.value },
      { scale: orb2Scale.value },
    ],
  }));
  const orb3Style = useAnimatedStyle(() => ({
    opacity: orb3Opacity.value,
    transform: [
      { translateX: orb3X.value },
      { translateY: orb3Y.value },
      { scale: orb3Scale.value },
    ],
  }));

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
      {/* Mobile-width periwinkle container on web, full screen on native */}
      <Animated.View ref={phoneRef} style={[styles.phoneContainer, phoneParallaxStyle]}>
        {/* Orbs — start invisible, fade in after cinematic entrance */}
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
          <Animated.View style={[styles.orb, styles.orb1, orb1Style]} />
          <Animated.View style={[styles.orb, styles.orb2, orb2Style]} />
          <Animated.View style={[styles.orb, styles.orb3, orb3Style]} />
        </View>

        {/* Dark overlay */}
        <View style={styles.darkOverlay} pointerEvents="none" />

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
    // Soft periwinkle glow — wide and shallow to blend into the background
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 200px 80px rgba(131, 130, 201, 0.5)' }
      : {}),
  } as any,
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK_OVERLAY_COLOR,
    opacity: DARK_OVERLAY_OPACITY,
  },
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

  // Orbs — start at opacity 0, animated in
  orb: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
  orb1: {
    width: 200, height: 200,
    top: '10%', left: -50,
    ...(Platform.OS === 'web'
      ? { filter: 'blur(70px)' }
      : { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 70 }),
  } as any,
  orb2: {
    width: 250, height: 250,
    bottom: '20%', right: -80,
    ...(Platform.OS === 'web'
      ? { filter: 'blur(70px)' }
      : { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 70 }),
  } as any,
  orb3: {
    width: 150, height: 150,
    top: '45%', left: '30%',
    ...(Platform.OS === 'web'
      ? { filter: 'blur(70px)' }
      : { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 50 }),
  } as any,
});

export default AuthScreenWrapper;
