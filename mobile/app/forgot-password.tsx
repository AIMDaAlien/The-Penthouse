import { View, Text, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Pressable } from 'react-native';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../src/components/Input';
import Button from '../src/components/Button';
import { forgotPassword } from '../src/services/api';

// Wrapper that dismisses keyboard on native, but not on web
const DismissKeyboardView = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') {
    return <View className="flex-1">{children}</View>;
  }
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {children}
    </TouchableWithoutFeedback>
  );
};

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email/username');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      // API returns success even if user doesn't exist (security)
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b]">
        <View className="flex-1 justify-center px-10 pb-10">
          <View className="items-center mb-12">
            <View 
              className="w-20 h-20 bg-green-500/10 border border-green-500/30 items-center justify-center"
              style={{
                borderTopLeftRadius: 32,
                borderBottomRightRadius: 32,
                borderTopRightRadius: 8,
                borderBottomLeftRadius: 8,
              }}
            >
              <Text className="text-4xl">✓</Text>
            </View>
            <Text className="text-2xl font-black text-white text-center mt-6" style={{ letterSpacing: -1 }}>
              CHECK YOUR EMAIL
            </Text>
            <Text className="text-zinc-400 text-center mt-4 px-4">
              If an account exists with that email, we sent password reset instructions.
            </Text>
          </View>

          <Link href="/login" asChild>
            <Pressable className="bg-[#cba6f7] py-4 rounded-2xl items-center">
              <Text className="text-black font-black text-sm uppercase tracking-widest">
                Back to Login
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <DismissKeyboardView>
          <View className="flex-1 justify-center px-10 pb-10">
            
            <View className="items-center mb-12">
              <View 
                className="w-20 h-20 bg-[#cba6f7]/10 border border-[#cba6f7]/30 items-center justify-center"
                style={{
                  borderTopLeftRadius: 32,
                  borderBottomRightRadius: 32,
                  borderTopRightRadius: 8,
                  borderBottomLeftRadius: 8,
                }}
              >
                <Text className="text-4xl">🔐</Text>
              </View>
              <Text className="text-2xl font-black text-white text-center mt-6" style={{ letterSpacing: -1 }}>
                FORGOT PASSWORD
              </Text>
              <Text className="text-zinc-400 text-center mt-4 px-4">
                Enter your email and we'll send you a link to reset your password.
              </Text>
            </View>

            <View className="w-full">
              {error ? (
                <View className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl mb-6">
                  <Text className="text-red-400 text-center text-xs font-bold uppercase tracking-widest">{error}</Text>
                </View>
              ) : null}

              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                className="mb-6"
              />

              <Button
                title="SEND RESET LINK"
                onPress={handleSubmit}
                isLoading={isLoading}
                className="mb-6 shadow-xl shadow-[#cba6f7]/20"
              />

              <Link href="/login" asChild>
                <Pressable>
                  <Text className="text-zinc-500 text-center text-xs font-semibold">
                    Back to Login
                  </Text>
                </Pressable>
              </Link>
            </View>

          </View>
        </DismissKeyboardView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
