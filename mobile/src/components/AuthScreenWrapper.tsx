/**
 * AuthScreenWrapper — Shared shell for all auth screens (login, register, forgot-password).
 * Provides the POC 3 aesthetic: periwinkle background, animated white glow orbs,
 * dark grey overlay, mobile-width container on web, and overflow clipping.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from 'react-native-reanimated';

const PERIWINKLE = '#8382C9';

const DARK_OVERLAY_COLOR = '#1a1a1a';
const DARK_OVERLAY_OPACITY = 0.25;

const EXPRESSIVE_SPRING = { damping: 15, stiffness: 120, mass: 1 };

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
  // Entrance animation
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(40);

  // Orb drift animations
  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);
  const orb3X = useSharedValue(0);
  const orb3Y = useSharedValue(0);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 600 });
    contentTranslateY.value = withSpring(0, EXPRESSIVE_SPRING);

    orb1X.value = withRepeat(withSequence(
      withTiming(40, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
      withTiming(-20, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);
    orb1Y.value = withRepeat(withSequence(
      withTiming(60, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
      withTiming(100, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);

    orb2X.value = withRepeat(withSequence(
      withTiming(-60, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
      withTiming(-10, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);
    orb2Y.value = withRepeat(withSequence(
      withTiming(-40, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
      withTiming(-90, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);

    orb3X.value = withRepeat(
      withTiming(50, { duration: 15000, easing: Easing.inOut(Easing.quad) }),
      -1, true
    );
    orb3Y.value = withRepeat(
      withTiming(-50, { duration: 15000, easing: Easing.inOut(Easing.quad) }),
      -1, true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({ transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }] }));
  const orb2Style = useAnimatedStyle(() => ({ transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }] }));
  const orb3Style = useAnimatedStyle(() => ({ transform: [{ translateX: orb3X.value }, { translateY: orb3Y.value }] }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View style={styles.outerContainer}>
      {/* Mobile-width periwinkle container on web, full screen on native */}
      <View style={styles.phoneContainer}>
        {/* Orbs */}
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
                <Animated.View style={[contentStyle, !centered && styles.contentSpaceBetween]}>
                  {children}
                </Animated.View>
              </ScrollView>
            </DismissKeyboardView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#11111b',
    alignItems: 'center',
    justifyContent: 'center',
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  phoneContainer: {
    flex: 1,
    backgroundColor: PERIWINKLE,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : undefined,
    overflow: 'hidden',
    // Soft periwinkle glow that bleeds into the dark background on web
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 0 120px 60px ${PERIWINKLE}` }
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

  // Orbs
  orb: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
  orb1: {
    width: 200, height: 200,
    top: '10%', left: -50,
    opacity: 0.35,
    ...(Platform.OS === 'web'
      ? { filter: 'blur(70px)' }
      : { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 70 }),
  } as any,
  orb2: {
    width: 250, height: 250,
    bottom: '20%', right: -80,
    opacity: 0.25,
    ...(Platform.OS === 'web'
      ? { filter: 'blur(70px)' }
      : { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 70 }),
  } as any,
  orb3: {
    width: 150, height: 150,
    top: '45%', left: '30%',
    opacity: 0.2,
    ...(Platform.OS === 'web'
      ? { filter: 'blur(70px)' }
      : { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 50 }),
  } as any,
});

export default AuthScreenWrapper;
