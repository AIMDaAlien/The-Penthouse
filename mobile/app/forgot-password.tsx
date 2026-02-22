import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { AuthScreenWrapper } from '../src/components/AuthScreenWrapper';
import { BlurView } from 'expo-blur';
import { forgotPassword } from '../src/services/api';

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

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
          <Text style={s.theText}>THE</Text>
          <Text style={s.penthouseText}>{'PENT\nHOUSE'}</Text>
          <Text style={s.subtitle}>Reset your access credentials</Text>
        </View>

        {/* Form */}
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.inputGroup}>
          <Text style={s.label}>Email / Username</Text>
          <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={COLORS.placeholderText}
            value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
        </View>

        <Pressable onPress={handleSubmit} disabled={isLoading}
          style={({ pressed }) => [s.frostedButton, pressed && s.frostedButtonPressed, isLoading && { opacity: 0.6 }]}>
          {Platform.OS === 'ios' && <BlurView intensity={12} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: 50, overflow: 'hidden' }]} />}
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Send Reset Link</Text>}
        </Pressable>

        <View style={s.footerLinks}>
          <Link href="/login" asChild>
            <Pressable><Text style={s.footerLink}>Back to Login</Text></Pressable>
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
  frostedButton: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 50, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 10 },
  frostedButtonPressed: { backgroundColor: 'rgba(255,255,255,0.25)' },
  buttonText: { fontFamily: 'Ubuntu_500Medium', fontSize: 16, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 },
  errorBox: { backgroundColor: COLORS.errorBg, borderWidth: 1, borderColor: COLORS.errorBorder, borderRadius: 8, padding: 12 },
  errorText: { fontFamily: 'Ubuntu_500Medium', fontSize: 10, color: COLORS.errorText, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' },
  footerLinks: { flexDirection: 'row', justifyContent: 'center' },
  footerLink: { fontFamily: 'Ubuntu_400Regular', fontSize: 13, color: COLORS.textMuted },
});
