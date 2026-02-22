import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import { AuthScreenWrapper } from '../src/components/AuthScreenWrapper';
import { BlurView } from 'expo-blur';
import { forgotPassword } from '../src/services/api';
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
  successBg: 'rgba(166, 227, 161, 0.15)',
  successBorder: 'rgba(166, 227, 161, 0.4)',
  successText: '#a6e3a1',
};

const ENTRANCE_SPRING = { damping: 15, stiffness: 120, mass: 1 };

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Cinematic entrance ───
  const theOpacity = useSharedValue(0);
  const theTranslateY = useSharedValue(-30);
  const pentOpacity = useSharedValue(0);
  const pentScale = useSharedValue(2.5);
  const dividerScaleX = useSharedValue(0);
  const subOpacity = useSharedValue(0);
  const subTranslateY = useSharedValue(15);
  const form1Opacity = useSharedValue(0);
  const form1TranslateY = useSharedValue(40);
  const form2Opacity = useSharedValue(0);
  const form2TranslateY = useSharedValue(40);
  const form3Opacity = useSharedValue(0);
  const form3TranslateY = useSharedValue(40);

  useEffect(() => {
    pentOpacity.value = withSpring(1, ENTRANCE_SPRING);
    pentScale.value = withSpring(1, { damping: 18, stiffness: 80, mass: 1 });
    theOpacity.value = withDelay(200, withSpring(1, ENTRANCE_SPRING));
    theTranslateY.value = withDelay(200, withSpring(0, ENTRANCE_SPRING));
    dividerScaleX.value = withDelay(500, withSpring(1, ENTRANCE_SPRING));
    subOpacity.value = withDelay(700, withSpring(0.8, ENTRANCE_SPRING));
    subTranslateY.value = withDelay(700, withSpring(0, ENTRANCE_SPRING));
    form1Opacity.value = withDelay(900, withSpring(1, ENTRANCE_SPRING));
    form1TranslateY.value = withDelay(900, withSpring(0, ENTRANCE_SPRING));
    form2Opacity.value = withDelay(1050, withSpring(1, ENTRANCE_SPRING));
    form2TranslateY.value = withDelay(1050, withSpring(0, ENTRANCE_SPRING));
    form3Opacity.value = withDelay(1200, withSpring(1, ENTRANCE_SPRING));
    form3TranslateY.value = withDelay(1200, withSpring(0, ENTRANCE_SPRING));
  }, []);

  const theStyle = useAnimatedStyle(() => ({ opacity: theOpacity.value, transform: [{ translateY: theTranslateY.value }] }));
  const pentStyle = useAnimatedStyle(() => ({ opacity: pentOpacity.value, transform: [{ scale: pentScale.value }], transformOrigin: 'top left' }));
  const dividerStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: dividerScaleX.value }], transformOrigin: 'left' }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value, transform: [{ translateY: subTranslateY.value }] }));
  const f1Style = useAnimatedStyle(() => ({ opacity: form1Opacity.value, transform: [{ translateY: form1TranslateY.value }] }));
  const f2Style = useAnimatedStyle(() => ({ opacity: form2Opacity.value, transform: [{ translateY: form2TranslateY.value }] }));
  const f3Style = useAnimatedStyle(() => ({ opacity: form3Opacity.value, transform: [{ translateY: form3TranslateY.value }] }));

  const handleSubmit = async () => {
    if (!email) { setError('Please enter your email or username'); return; }
    try {
      setError(''); setIsLoading(true);
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      // Always show success for security (don't reveal if account exists)
      setSuccess(true);
    } finally { setIsLoading(false); }
  };

  if (success) {
    return (
      <AuthScreenWrapper centered>
        <View style={{ alignItems: 'center', gap: 16, paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 48 }}>✓</Text>
          <Text style={s.penthouseText}>CHECK{'\n'}YOUR EMAIL</Text>
          <Text style={[s.subtitle, { textAlign: 'center', marginTop: 8 }]}>
            If an account exists with that email, we've sent password reset instructions.
          </Text>

          <Link href="/login" asChild>
            <Pressable style={[s.frostedButton, { marginTop: 30, width: '100%' }]}>
              {Platform.OS === 'ios' && <BlurView intensity={12} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 50, overflow: 'hidden' }]} />}
              <Text style={s.buttonText}>Back to Login</Text>
            </Pressable>
          </Link>
        </View>
      </AuthScreenWrapper>
    );
  }

  return (
    <AuthScreenWrapper centered>
      <View style={{ gap: 25 }}>
        {/* Header */}
        <View>
          <Animated.View style={theStyle}>
            <Text style={s.theText}>THE</Text>
          </Animated.View>
          <Animated.View style={pentStyle}>
            <Text style={s.penthouseText}>{'PENT\nHOUSE'}</Text>
          </Animated.View>
          <Animated.View style={[s.divider, dividerStyle]} />
          <Animated.View style={subStyle}>
            <Text style={s.subtitle}>Reset your access credentials</Text>
          </Animated.View>
        </View>

        {/* Form */}
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <Animated.View style={f1Style}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Email / Username</Text>
            <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={COLORS.placeholderText}
              value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
          </View>
        </Animated.View>

        <Animated.View style={f2Style}>
          <Pressable onPress={handleSubmit} disabled={isLoading}
            style={({ pressed }) => [s.frostedButton, pressed && s.frostedButtonPressed, isLoading && { opacity: 0.6 }]}>
            {Platform.OS === 'ios' && <BlurView intensity={12} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 50, overflow: 'hidden' }]} />}
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Send Reset Link</Text>}
          </Pressable>
        </Animated.View>

        <Animated.View style={f3Style}>
          <View style={s.footerLinks}>
            <Link href="/login" asChild>
              <Pressable><Text style={s.footerLink}>Back to Login</Text></Pressable>
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
  frostedButton: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 50, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 10 },
  frostedButtonPressed: { backgroundColor: 'rgba(255,255,255,0.25)' },
  buttonText: { fontFamily: 'Ubuntu_500Medium', fontSize: 16, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 },
  errorBox: { backgroundColor: COLORS.errorBg, borderWidth: 1, borderColor: COLORS.errorBorder, borderRadius: 8, padding: 12 },
  errorText: { fontFamily: 'Ubuntu_500Medium', fontSize: 10, color: COLORS.errorText, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' },
  footerLinks: { flexDirection: 'row', justifyContent: 'center' },
  footerLink: { fontFamily: 'Ubuntu_400Regular', fontSize: 13, color: COLORS.textMuted },
});
