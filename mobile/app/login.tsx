import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { AuthScreenWrapper } from '../src/components/AuthScreenWrapper';
import { BlurView } from 'expo-blur';
import { getApiErrorMessage } from '../src/utils/apiErrors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

const COLORS = {
  textMain: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.65)',
  lineBorder: 'rgba(255, 255, 255, 0.3)',
  placeholderText: 'rgba(255, 255, 255, 0.4)',
  errorBg: 'rgba(243, 139, 168, 0.15)',
  errorBorder: 'rgba(243, 139, 168, 0.4)',
  errorText: '#f38ba8',
};

// Project-mandated spring (dampingRatio ≈ 0.8, stiffness ≈ 300)
const ENTRANCE_SPRING = { damping: 15, stiffness: 120, mass: 1 };

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // ─── Cinematic entrance: per-element animated values ───
  // THE
  const theOpacity = useSharedValue(0);
  const theTranslateY = useSharedValue(-30);
  // PENTHOUSE (scale from 2.5 → 1)
  const pentOpacity = useSharedValue(0);
  const pentScale = useSharedValue(2.5);
  // Divider (scaleX from 0 → 1)
  const dividerScaleX = useSharedValue(0);
  // Subtitle
  const subOpacity = useSharedValue(0);
  const subTranslateY = useSharedValue(15);
  // Form items (staggered)
  const form1Opacity = useSharedValue(0);
  const form1TranslateY = useSharedValue(40);
  const form2Opacity = useSharedValue(0);
  const form2TranslateY = useSharedValue(40);
  const form3Opacity = useSharedValue(0);
  const form3TranslateY = useSharedValue(40);
  const form4Opacity = useSharedValue(0);
  const form4TranslateY = useSharedValue(40);

  useEffect(() => {
    // Phase 1 — Cinematic entrance cascade
    // PENTHOUSE: immediate, scale down from 2.5
    pentOpacity.value = withSpring(1, ENTRANCE_SPRING);
    pentScale.value = withSpring(1, { damping: 18, stiffness: 80, mass: 1 });

    // THE: slight delay
    theOpacity.value = withDelay(200, withSpring(1, ENTRANCE_SPRING));
    theTranslateY.value = withDelay(200, withSpring(0, ENTRANCE_SPRING));

    // Divider line
    dividerScaleX.value = withDelay(500, withSpring(1, ENTRANCE_SPRING));

    // Subtitle
    subOpacity.value = withDelay(700, withSpring(0.8, ENTRANCE_SPRING));
    subTranslateY.value = withDelay(700, withSpring(0, ENTRANCE_SPRING));

    // Form cascade
    form1Opacity.value = withDelay(900, withSpring(1, ENTRANCE_SPRING));
    form1TranslateY.value = withDelay(900, withSpring(0, ENTRANCE_SPRING));
    form2Opacity.value = withDelay(1050, withSpring(1, ENTRANCE_SPRING));
    form2TranslateY.value = withDelay(1050, withSpring(0, ENTRANCE_SPRING));
    form3Opacity.value = withDelay(1200, withSpring(1, ENTRANCE_SPRING));
    form3TranslateY.value = withDelay(1200, withSpring(0, ENTRANCE_SPRING));
    form4Opacity.value = withDelay(1400, withSpring(1, ENTRANCE_SPRING));
    form4TranslateY.value = withDelay(1400, withSpring(0, ENTRANCE_SPRING));
  }, []);

  // ─── Animated styles ───
  const theStyle = useAnimatedStyle(() => ({
    opacity: theOpacity.value,
    transform: [{ translateY: theTranslateY.value }],
  }));
  const pentStyle = useAnimatedStyle(() => ({
    opacity: pentOpacity.value,
    transform: [{ scale: pentScale.value }],
    transformOrigin: 'top left',
  }));
  const dividerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: dividerScaleX.value }],
    transformOrigin: 'left',
  }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
    transform: [{ translateY: subTranslateY.value }],
  }));
  const f1Style = useAnimatedStyle(() => ({ opacity: form1Opacity.value, transform: [{ translateY: form1TranslateY.value }] }));
  const f2Style = useAnimatedStyle(() => ({ opacity: form2Opacity.value, transform: [{ translateY: form2TranslateY.value }] }));
  const f3Style = useAnimatedStyle(() => ({ opacity: form3Opacity.value, transform: [{ translateY: form3TranslateY.value }] }));
  const f4Style = useAnimatedStyle(() => ({ opacity: form4Opacity.value, transform: [{ translateY: form4TranslateY.value }] }));

  const handleLogin = async () => {
    if (!username || !password) { setError('Please fill in all fields'); return; }
    try {
      setError(''); setIsLoading(true);
      await login(username.trim(), password);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Login failed. Please check credentials.'));
    } finally { setIsLoading(false); }
  };

  return (
    <AuthScreenWrapper>
      {/* Header — top-anchored */}
      <View>
        <Animated.View style={theStyle}>
          <Text style={s.theText}>THE</Text>
        </Animated.View>
        <Animated.View style={pentStyle}>
          <Text style={s.penthouseText}>{'PENT\nHOUSE'}</Text>
        </Animated.View>
        <Animated.View style={[s.divider, dividerStyle]} />
        <Animated.View style={subStyle}>
          <Text style={s.subtitle}>No point being wealthy without freedom</Text>
        </Animated.View>
      </View>

      {/* Form — bottom-anchored */}
      <View style={{ gap: 25, marginBottom: 25 }}>
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <Animated.View style={f1Style}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Username / Email</Text>
            <TextInput style={s.input} placeholder="Enter your credentials" placeholderTextColor={COLORS.placeholderText}
              value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          </View>
        </Animated.View>

        <Animated.View style={f2Style}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} placeholder="Enter your password" placeholderTextColor={COLORS.placeholderText}
              value={password} onChangeText={setPassword} secureTextEntry />
          </View>
        </Animated.View>

        <Animated.View style={f3Style}>
          <Pressable onPress={handleLogin} disabled={isLoading}
            style={({ pressed }) => [s.frostedButton, pressed && s.frostedButtonPressed, isLoading && { opacity: 0.6 }]}>
            {Platform.OS === 'ios' && <BlurView intensity={12} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 50, overflow: 'hidden' }]} />}
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Log In</Text>}
          </Pressable>
        </Animated.View>

        <Animated.View style={f4Style}>
          <View style={s.footerLinks}>
            <Link href="/forgot-password" asChild>
              <Pressable><Text style={s.footerLink}>Forgot Password?</Text></Pressable>
            </Link>
            <Link href="/register" asChild>
              <Pressable><Text style={s.footerLink}>Sign Up</Text></Pressable>
            </Link>
          </View>
        </Animated.View>
      </View>
    </AuthScreenWrapper>
  );
}

const s = StyleSheet.create({
  theText: { fontFamily: 'Ubuntu_300Light', fontSize: 30, letterSpacing: 6, color: '#fff', marginBottom: 5, marginLeft: 3 },
  penthouseText: { fontFamily: 'Erode-SemiBold', fontSize: 96, lineHeight: 88, color: '#fff', letterSpacing: 1 },
  divider: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 15, marginBottom: 5 },
  subtitle: { fontFamily: 'Ubuntu_300Light', fontSize: 15, color: '#fff', opacity: 0.8, marginTop: 10, letterSpacing: 0.5 },
  inputGroup: { gap: 6 },
  label: { fontFamily: 'Ubuntu_500Medium', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: COLORS.textMuted },
  input: { backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: 1, borderBottomColor: COLORS.lineBorder, borderRadius: 0, paddingVertical: 8, paddingHorizontal: 0, fontFamily: 'Ubuntu_400Regular', fontSize: 16, color: '#fff' },
  frostedButton: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 50, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 15 },
  frostedButtonPressed: { backgroundColor: 'rgba(255,255,255,0.25)' },
  buttonText: { fontFamily: 'Ubuntu_500Medium', fontSize: 16, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 },
  errorBox: { backgroundColor: COLORS.errorBg, borderWidth: 1, borderColor: COLORS.errorBorder, borderRadius: 8, padding: 12 },
  errorText: { fontFamily: 'Ubuntu_500Medium', fontSize: 10, color: COLORS.errorText, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' },
  footerLinks: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLink: { fontFamily: 'Ubuntu_400Regular', fontSize: 13, color: COLORS.textMuted },
});
