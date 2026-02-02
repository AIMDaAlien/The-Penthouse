import { TextInput, View, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className, ...props }: InputProps) {
  return (
    <View className="mb-6 w-full">
      {label && (
        <Text className="text-[#cba6f7] mb-2 font-bold ml-1 text-sm uppercase tracking-[2px]">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor="#52525b"
        className={`w-full bg-zinc-900 text-white px-6 py-5 border border-zinc-800 focus:border-[#cba6f7]/50 focus:bg-zinc-950 font-bold text-lg ${className}`}
        style={{
          borderTopLeftRadius: 24,
          borderBottomRightRadius: 24,
          borderTopRightRadius: 4,
          borderBottomLeftRadius: 4,
        }}
        {...props}
      />
      {error && (
        <Text className="text-red-400 text-xs mt-2 ml-1 font-medium italic">{error}</Text>
      )}
    </View>
  );
}
