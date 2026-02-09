import { View, Text, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image, Pressable } from 'react-native';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../src/components/Input';
import Button from '../src/components/Button';
import { useAuth } from '../src/context/AuthContext';

// Wrapper that dismisses keyboard on native, but not on web (where it steals focus)
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

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      await login(username, password);
      // Redirect handled by _layout
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <DismissKeyboardView>
          <View className="flex-1 justify-center px-10 pb-10">
            
            <View className="items-center mb-16">
              <View 
                className="w-24 h-24 bg-[#cba6f7]/10 border border-[#cba6f7]/30 items-center justify-center shadow-2xl shadow-[#cba6f7]/20"
                style={{
                  borderTopLeftRadius: 36,
                  borderBottomRightRadius: 36,
                  borderTopRightRadius: 8,
                  borderBottomLeftRadius: 8,
                }}
              >
                 <Text className="text-5xl font-black text-[#cba6f7]" style={{ letterSpacing: -2 }}>P</Text>
              </View>
              <View className="mt-8 items-center">
                <Text className="text-4xl font-black text-white text-center leading-none" style={{ letterSpacing: -1.5 }}>
                  WELCOME{"\n"}BACK
                </Text>
                <View className="h-1 w-12 bg-[#cba6f7] mt-4 rounded-full" />
                <Text className="text-zinc-500 text-sm font-bold uppercase tracking-[3px] mt-6 text-center">
                  Sign in to continue
                </Text>
              </View>
            </View>

            <View className="w-full">
              {error ? (
                <View className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl mb-8">
                  <Text className="text-red-400 text-center text-xs font-bold uppercase tracking-widest">{error}</Text>
                </View>
              ) : null}

              <Input
                label="Identity"
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Security"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                className="mb-8"
              />

              <Button
                title="LOG IN"
                onPress={handleLogin}
                isLoading={isLoading}
                className="mb-8 shadow-xl shadow-[#cba6f7]/20"
              />

              <View className="flex-row justify-center items-center gap-3">
                <View className="h-[1px] flex-1 bg-zinc-800" />
                <Link href="/register" asChild>
                  <Pressable>
                    <Text className="text-[#cba6f7] font-black text-xs uppercase tracking-[2px]">Create Account</Text>
                  </Pressable>
                </Link>
                <View className="h-[1px] flex-1 bg-zinc-800" />
              </View>
            </View>

          </View>
        </DismissKeyboardView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
