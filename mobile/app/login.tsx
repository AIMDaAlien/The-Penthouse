import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { AuthScreenWrapper } from '../src/components/AuthScreenWrapper';
import { BlurView } from 'expo-blur';

const COLORS = {
  textMain: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.65)',
  lineBorder: 'rgba(255, 255, 255, 0.3)',
  placeholderText: 'rgba(255, 255, 255, 0.4)',
  errorBg: 'rgba(243, 139, 168, 0.15)',
  errorBorder: 'rgba(243, 139, 168, 0.4)',
  errorText: '#f38ba8',
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) { setError('Please fill in all fields'); return; }
    try {
      setError(''); setIsLoading(true);
      await login(username, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally { setIsLoading(false); }
  };

  return (
    <AuthScreenWrapper>
      {/* Header — top-anchored */}
      <View>
        <Text style={s.theText}>THE</Text>
        <Text style={s.penthouseText}>{'PENT\nHOUSE'}</Text>
        <Text style={s.subtitle}>No point being wealthy without freedom</Text>
      </View>

      {/* Form — bottom-anchored */}
      <View style={{ gap: 25, marginBottom: 25 }}>
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.inputGroup}>
          <Text style={s.label}>Username / Email</Text>
          <TextInput style={s.input} placeholder="Enter your credentials" placeholderTextColor={COLORS.placeholderText}
            value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} placeholder="Enter your password" placeholderTextColor={COLORS.placeholderText}
            value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <Pressable onPress={handleLogin} disabled={isLoading}
          style={({ pressed }) => [s.frostedButton, pressed && s.frostedButtonPressed, isLoading && { opacity: 0.6 }]}>
          {Platform.OS === 'ios' && <BlurView intensity={12} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 50, overflow: 'hidden' }]} />}
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Log In</Text>}
        </Pressable>

        <View style={s.footerLinks}>
          <Link href="/forgot-password" asChild>
            <Pressable><Text style={s.footerLink}>Forgot Password?</Text></Pressable>
          </Link>
          <Link href="/register" asChild>
            <Pressable><Text style={s.footerLink}>Sign Up</Text></Pressable>
          </Link>
        </View>
      </View>
    </AuthScreenWrapper>
  );
}

const s = StyleSheet.create({
  theText: { fontFamily: 'Ubuntu_300Light', fontSize: 30, letterSpacing: 6, color: '#fff', marginBottom: 5, marginLeft: 3 },
  penthouseText: { fontFamily: 'Erode-SemiBold', fontSize: 96, lineHeight: 88, color: '#fff', letterSpacing: 1 },
  subtitle: { fontFamily: 'Ubuntu_300Light', fontSize: 15, color: '#fff', opacity: 0.8, marginTop: 15, letterSpacing: 0.5 },
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
