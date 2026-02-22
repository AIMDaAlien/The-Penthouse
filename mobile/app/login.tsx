import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

// POC 3 color palette
const COLORS = {
  bg: '#8382C9',         // Dominant periwinkle
  textMain: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.65)',
  lineBorder: 'rgba(255, 255, 255, 0.3)',
  placeholderText: 'rgba(255, 255, 255, 0.4)',
  errorBg: 'rgba(243, 139, 168, 0.15)',
  errorBorder: 'rgba(243, 139, 168, 0.4)',
  errorText: '#f38ba8',
};

// Expressive spring config (per M3 spec)
const EXPRESSIVE_SPRING = { damping: 15, stiffness: 120, mass: 1 };

const DismissKeyboardView = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') return <View style={{ flex: 1 }}>{children}</View>;
  return <TouchableWithoutFeedback onPress={Keyboard.dismiss}>{children}</TouchableWithoutFeedback>;
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

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
    // Content entrance
    contentOpacity.value = withTiming(1, { duration: 600 });
    contentTranslateY.value = withSpring(0, EXPRESSIVE_SPRING);

    // Orb 1 drift (matches POC3 @keyframes drift1)
    orb1X.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-20, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
      ), -1, true
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
        withTiming(100, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
      ), -1, true
    );

    // Orb 2 drift (matches POC3 @keyframes drift2)
    orb2X.value = withRepeat(
      withSequence(
        withTiming(-60, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-10, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
      ), -1, true
    );
    orb2Y.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-90, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
      ), -1, true
    );

    // Orb 3 drift (matches POC3 @keyframes drift3)
    orb3X.value = withRepeat(
      withTiming(50, { duration: 15000, easing: Easing.inOut(Easing.quad) }),
      -1, true
    );
    orb3Y.value = withRepeat(
      withTiming(-50, { duration: 15000, easing: Easing.inOut(Easing.quad) }),
      -1, true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));
  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }],
  }));
  const orb3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb3X.value }, { translateY: orb3Y.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    try {
      setError('');
      setIsLoading(true);
      await login(username, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Full-screen periwinkle background — overrides the app's BackgroundLayer
    <View style={styles.fullScreen}>
      {/* Drifting white glow orbs */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        <Animated.View style={[styles.orb, styles.orb1, orb1Style]} />
        <Animated.View style={[styles.orb, styles.orb2, orb2Style]} />
        <Animated.View style={[styles.orb, styles.orb3, orb3Style]} />
      </View>

      {/* Dark overlay for dark mode toning — the user requested this */}
      <View style={styles.darkOverlay} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <DismissKeyboardView>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View style={[contentStyle, styles.contentWrapper]}>

                {/* Header — top-anchored, "THE" in Ubuntu, "PENTHOUSE" in Erode */}
                <View style={styles.header}>
                  <Text style={styles.theText}>THE</Text>
                  <Text style={styles.penthouseText}>{'PENT\nHOUSE'}</Text>
                  <Text style={styles.subtitle}>Secure Resident Access</Text>
                </View>

                {/* Form — bottom-anchored with middle space breathing room */}
                <View style={styles.formSection}>
                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Username input — transparent, bottom border only */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Username / Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your credentials"
                      placeholderTextColor={COLORS.placeholderText}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Password input — transparent, bottom border only */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor={COLORS.placeholderText}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  {/* POC 3: Frosted Glass Pill Button */}
                  <Pressable
                    onPress={handleLogin}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.frostedButton,
                      pressed && styles.frostedButtonPressed,
                      isLoading && { opacity: 0.6 },
                    ]}
                  >
                    {Platform.OS === 'ios' && (
                      <BlurView
                        intensity={12}
                        tint="light"
                        style={[StyleSheet.absoluteFill, { borderRadius: 50, overflow: 'hidden' }]}
                      />
                    )}
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.textMain} />
                    ) : (
                      <Text style={styles.buttonText}>Log In</Text>
                    )}
                  </Pressable>

                  {/* Footer links */}
                  <View style={styles.footerLinks}>
                    <Link href="/forgot-password" asChild>
                      <Pressable>
                        <Text style={styles.footerLink}>Forgot Password?</Text>
                      </Pressable>
                    </Link>
                    <Link href="/register" asChild>
                      <Pressable>
                        <Text style={styles.footerLink}>Contact Concierge</Text>
                      </Pressable>
                    </Link>
                  </View>
                </View>

              </Animated.View>
            </ScrollView>
          </DismissKeyboardView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    // This makes the auth screen completely opaque, covering the app's dark BackgroundLayer
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  // Dark overlay — subtle grey at low opacity to deepen dark mode without killing periwinkle
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    opacity: 0.25,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 35,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 50,
    paddingBottom: 40,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // --- Header ---
  header: {
    marginBottom: 'auto' as any,
  },
  theText: {
    fontFamily: 'Ubuntu_300Light',
    fontSize: 20,
    letterSpacing: 6,
    color: COLORS.textMain,
    marginBottom: 5,
    marginLeft: 3,
  },
  penthouseText: {
    fontFamily: 'Erode-SemiBold',
    fontSize: 55,
    lineHeight: 52,
    color: COLORS.textMain,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: 'Ubuntu_300Light',
    fontSize: 15,
    color: COLORS.textMain,
    opacity: 0.8,
    marginTop: 15,
    letterSpacing: 0.5,
  },

  // --- Form ---
  formSection: {
    gap: 25,
    marginBottom: 25,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'Ubuntu_500Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: COLORS.textMuted,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lineBorder,
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 0,
    fontFamily: 'Ubuntu_400Regular',
    fontSize: 16,
    color: COLORS.textMain,
  },

  // --- POC 3 Frosted Glass Button ---
  frostedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 15,
  },
  frostedButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  buttonText: {
    fontFamily: 'Ubuntu_500Medium',
    fontSize: 16,
    color: COLORS.textMain,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // --- Error ---
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontFamily: 'Ubuntu_500Medium',
    fontSize: 10,
    color: COLORS.errorText,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },

  // --- Footer ---
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLink: {
    fontFamily: 'Ubuntu_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // --- Orbs ---
  orb: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
  orb1: {
    width: 200,
    height: 200,
    top: '10%',
    left: -50,
    opacity: 0.35,
    // CSS filter not available in RN — use shadow as glow approximation
    ...(Platform.OS === 'web'
      ? { filter: 'blur(70px)' }
      : {
          shadowColor: '#ffffff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 70,
        }),
  } as any,
  orb2: {
    width: 250,
    height: 250,
    bottom: '20%',
    right: -80,
    opacity: 0.25,
    ...(Platform.OS === 'web'
      ? { filter: 'blur(70px)' }
      : {
          shadowColor: '#ffffff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 70,
        }),
  } as any,
  orb3: {
    width: 150,
    height: 150,
    top: '45%',
    left: '30%',
    opacity: 0.2,
    ...(Platform.OS === 'web'
      ? { filter: 'blur(70px)' }
      : {
          shadowColor: '#ffffff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 50,
        }),
  } as any,
});
