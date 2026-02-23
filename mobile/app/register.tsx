import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { AuthScreenWrapper } from '../src/components/AuthScreenWrapper';
import { BlurView } from 'expo-blur';
import { getApiErrorMessage } from '../src/utils/apiErrors';
import { AUTH_COPY, getPasswordValidationError, isValidEmail, isValidUsername } from '../src/utils/authRules';
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

const ENTRANCE_SPRING = { damping: 15, stiffness: 120, mass: 1 };

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  // ─── Cinematic entrance ───
  const theOpacity = useSharedValue(0);
  const theTranslateY = useSharedValue(-30);
  const pentOpacity = useSharedValue(0);
  const pentScale = useSharedValue(2.5);
  const dividerScaleX = useSharedValue(0);
  const subOpacity = useSharedValue(0);
  const subTranslateY = useSharedValue(15);
  // 7 form items for register (5 inputs + button + footer)
  const formOpacities = Array.from({ length: 7 }, () => useSharedValue(0));
  const formTranslates = Array.from({ length: 7 }, () => useSharedValue(40));

  useEffect(() => {
    pentOpacity.value = withSpring(1, ENTRANCE_SPRING);
    pentScale.value = withSpring(1, { damping: 18, stiffness: 80, mass: 1 });
    theOpacity.value = withDelay(200, withSpring(1, ENTRANCE_SPRING));
    theTranslateY.value = withDelay(200, withSpring(0, ENTRANCE_SPRING));
    dividerScaleX.value = withDelay(500, withSpring(1, ENTRANCE_SPRING));
    subOpacity.value = withDelay(700, withSpring(0.8, ENTRANCE_SPRING));
    subTranslateY.value = withDelay(700, withSpring(0, ENTRANCE_SPRING));

    formOpacities.forEach((sv, i) => {
      sv.value = withDelay(900 + i * 120, withSpring(1, ENTRANCE_SPRING));
    });
    formTranslates.forEach((sv, i) => {
      sv.value = withDelay(900 + i * 120, withSpring(0, ENTRANCE_SPRING));
    });
  }, []);

  const theStyle = useAnimatedStyle(() => ({ opacity: theOpacity.value, transform: [{ translateY: theTranslateY.value }] }));
  const pentStyle = useAnimatedStyle(() => ({ opacity: pentOpacity.value, transform: [{ scale: pentScale.value }], transformOrigin: 'top left' }));
  const dividerStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: dividerScaleX.value }], transformOrigin: 'left' }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value, transform: [{ translateY: subTranslateY.value }] }));
  const fStyles = formOpacities.map((op, i) =>
    useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: formTranslates[i].value }] }))
  );

  const handleRegister = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedDisplayName = displayName.trim();

    if (!normalizedUsername || !normalizedEmail || !password || !confirmPassword) {
      setError('Please fill in all required fields'); return;
    }
    if (!isValidUsername(normalizedUsername)) {
      setError(AUTH_COPY.username); return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address'); return;
    }
    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError); return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match'); return;
    }
    try {
      setError(''); setIsLoading(true);
      await register(
        normalizedUsername,
        normalizedEmail,
        password,
        normalizedDisplayName || undefined
      );
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally { setIsLoading(false); }
  };

  return (
    <AuthScreenWrapper>
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
          <Text style={s.subtitle}>Request Residency</Text>
        </Animated.View>
      </View>

      {/* Form */}
      <View style={{ gap: 20, marginBottom: 25 }}>
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <Animated.View style={fStyles[0]}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Username</Text>
            <TextInput style={s.input} placeholder="Choose a username" placeholderTextColor={COLORS.placeholderText}
              value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
            <Text style={s.helperText}>{AUTH_COPY.username}</Text>
          </View>
        </Animated.View>

        <Animated.View style={fStyles[1]}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Email</Text>
            <TextInput style={s.input} placeholder="your@email.com" placeholderTextColor={COLORS.placeholderText}
              value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>
        </Animated.View>

        <Animated.View style={fStyles[2]}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Display Name</Text>
            <TextInput style={s.input} placeholder="How you appear to others" placeholderTextColor={COLORS.placeholderText}
              value={displayName} onChangeText={setDisplayName} />
          </View>
        </Animated.View>

        <Animated.View style={fStyles[3]}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} placeholder="At least 8 characters" placeholderTextColor={COLORS.placeholderText}
              value={password} onChangeText={setPassword} secureTextEntry />
            <Text style={s.helperText}>{AUTH_COPY.password}</Text>
          </View>
        </Animated.View>

        <Animated.View style={fStyles[4]}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Confirm Password</Text>
            <TextInput style={s.input} placeholder="Repeat your password" placeholderTextColor={COLORS.placeholderText}
              value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          </View>
        </Animated.View>

        <Animated.View style={fStyles[5]}>
          <Pressable onPress={handleRegister} disabled={isLoading}
            style={({ pressed }) => [s.frostedButton, pressed && s.frostedButtonPressed, isLoading && { opacity: 0.6 }]}>
            {Platform.OS === 'ios' && <BlurView intensity={12} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 50, overflow: 'hidden' }]} />}
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Create Account</Text>}
          </Pressable>
        </Animated.View>

        <Animated.View style={fStyles[6]}>
          <View style={s.footerLinks}>
            <Link href="/login" asChild>
              <Pressable><Text style={s.footerLink}>Already a resident? Sign In</Text></Pressable>
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
  helperText: { fontFamily: 'Ubuntu_400Regular', fontSize: 11, color: COLORS.textMuted, opacity: 0.85 },
  frostedButton: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 50, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 10 },
  frostedButtonPressed: { backgroundColor: 'rgba(255,255,255,0.25)' },
  buttonText: { fontFamily: 'Ubuntu_500Medium', fontSize: 16, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 },
  errorBox: { backgroundColor: COLORS.errorBg, borderWidth: 1, borderColor: COLORS.errorBorder, borderRadius: 8, padding: 12 },
  errorText: { fontFamily: 'Ubuntu_500Medium', fontSize: 10, color: COLORS.errorText, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' },
  footerLinks: { flexDirection: 'row', justifyContent: 'center' },
  footerLink: { fontFamily: 'Ubuntu_400Regular', fontSize: 13, color: COLORS.textMuted },
});
