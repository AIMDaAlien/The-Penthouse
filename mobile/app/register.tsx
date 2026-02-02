import { View, Text, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, Pressable } from 'react-native';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Input from '../src/components/Input';
import Button from '../src/components/Button';
import { useAuth } from '../src/context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
        setError('Please fill in all required fields');
        return;
    }

    if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
    }

    try {
      setError('');
      setIsLoading(true);
      console.log('Attempting registration for:', username);
      await register(username, password, displayName);
      console.log('Registration successful');
    } catch (err: any) {
      console.error('Registration error detail:', err.response?.data || err.message || err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={{flexGrow: 1, paddingBottom: 40}} 
            className="px-10"
            showsVerticalScrollIndicator={false}
          >
            
            <View className="items-center mb-12 mt-10">
              <View 
                className="w-20 h-20 bg-[#cba6f7]/10 border border-[#cba6f7]/30 items-center justify-center shadow-2xl shadow-[#cba6f7]/20"
                style={{
                  borderTopLeftRadius: 30,
                  borderBottomRightRadius: 30,
                  borderTopRightRadius: 6,
                  borderBottomLeftRadius: 6,
                }}
              >
                 <Text className="text-4xl font-black text-[#cba6f7]" style={{ letterSpacing: -2 }}>+</Text>
              </View>
              <View className="mt-8 items-center">
                <Text className="text-3xl font-black text-white text-center leading-none" style={{ letterSpacing: -1.5 }}>
                  CREATE{"\n"}ACCOUNT
                </Text>
                <View className="h-1 w-12 bg-[#cba6f7] mt-4 rounded-full" />
                <Text className="text-zinc-500 text-sm font-bold uppercase tracking-[3px] mt-6 text-center">
                  Join The Penthouse
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
              />

              <Input
                label="Alias"
                placeholder="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
              />

              <Input
                label="Security"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

               <Input
                label="Verify"
                placeholder="Repeat password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                className="mb-8"
              />

              <Button
                title="CREATE ACCOUNT"
                onPress={handleRegister}
                isLoading={isLoading}
                className="mb-8 shadow-xl shadow-[#cba6f7]/20"
              />

              <View className="flex-row justify-center items-center gap-3">
                <View className="h-[1px] flex-1 bg-zinc-800" />
                <Link href="/login" asChild>
                  <Pressable>
                    <Text className="text-[#cba6f7] font-black text-xs uppercase tracking-[2px]">Sign In</Text>
                  </Pressable>
                </Link>
                <View className="h-[1px] flex-1 bg-zinc-800" />
              </View>
            </View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
