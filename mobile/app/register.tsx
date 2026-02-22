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

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields'); return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match'); return;
    }
    try {
      setError(''); setIsLoading(true);
      await register(username, email, password, displayName);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setIsLoading(false); }
  };

  return (
    <AuthScreenWrapper>
      {/* Header */}
      <View>
        <Text style={s.theText}>THE</Text>
        <Text style={s.penthouseText}>{'PENT\nHOUSE'}</Text>
        <Text style={s.subtitle}>Request Residency</Text>
      </View>

      {/* Form */}
      <View style={{ gap: 20, marginBottom: 25 }}>
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.inputGroup}>
          <Text style={s.label}>Username</Text>
          <TextInput style={s.input} placeholder="Choose a username" placeholderTextColor={COLORS.placeholderText}
            value={username} onChangeText={setUsername} autoCapitalize="none" />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="your@email.com" placeholderTextColor={COLORS.placeholderText}
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Display Name</Text>
          <TextInput style={s.input} placeholder="How you appear to others" placeholderTextColor={COLORS.placeholderText}
            value={displayName} onChangeText={setDisplayName} />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} placeholder="At least 8 characters" placeholderTextColor={COLORS.placeholderText}
            value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Confirm Password</Text>
          <TextInput style={s.input} placeholder="Repeat your password" placeholderTextColor={COLORS.placeholderText}
            value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        </View>

        <Pressable onPress={handleRegister} disabled={isLoading}
          style={({ pressed }) => [s.frostedButton, pressed && s.frostedButtonPressed, isLoading && { opacity: 0.6 }]}>
          {Platform.OS === 'ios' && <BlurView intensity={12} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 50, overflow: 'hidden' }]} />}
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Create Account</Text>}
        </Pressable>

        <View style={s.footerLinks}>
          <Link href="/login" asChild>
            <Pressable><Text style={s.footerLink}>Already a resident? Sign In</Text></Pressable>
          </Link>
        </View>
      </View>
    </AuthScreenWrapper>
  );
}

const s = StyleSheet.create({
  theText: { fontFamily: 'Ubuntu_300Light', fontSize: 20, letterSpacing: 6, color: '#fff', marginBottom: 5, marginLeft: 3 },
  penthouseText: { fontFamily: 'Erode-SemiBold', fontSize: 55, lineHeight: 52, color: '#fff', letterSpacing: 1 },
  subtitle: { fontFamily: 'Ubuntu_300Light', fontSize: 15, color: '#fff', opacity: 0.8, marginTop: 15, letterSpacing: 0.5 },
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
