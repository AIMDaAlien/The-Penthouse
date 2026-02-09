import { View, Text, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Pressable } from 'react-native';
import { useState } from 'react';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../src/components/Input';
import Button from '../src/components/Button';
import { resetPassword } from '../src/services/api';

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

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may be expired.');
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
              PASSWORD RESET
            </Text>
            <Text className="text-zinc-400 text-center mt-4 px-4">
              Your password has been successfully reset. You can now log in with your new password.
            </Text>
          </View>

          <Link href="/login" asChild>
            <Pressable className="bg-[#cba6f7] py-4 rounded-2xl items-center">
              <Text className="text-black font-black text-sm uppercase tracking-widest">
                Go to Login
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
                <Text className="text-4xl">🔑</Text>
              </View>
              <Text className="text-2xl font-black text-white text-center mt-6" style={{ letterSpacing: -1 }}>
                NEW PASSWORD
              </Text>
              <Text className="text-zinc-400 text-center mt-4 px-4">
                Enter your new password below.
              </Text>
            </View>

            <View className="w-full">
              {error ? (
                <View className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl mb-6">
                  <Text className="text-red-400 text-center text-xs font-bold uppercase tracking-widest">{error}</Text>
                </View>
              ) : null}

              <Input
                label="New Password"
                placeholder="••••••••"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              <Input
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                className="mb-6"
              />

              <Button
                title="RESET PASSWORD"
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
