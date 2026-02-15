import { Text, Pressable, PressableProps, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({ title, variant = 'primary', isLoading, className, style, ...props }: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-zinc-800 border border-zinc-700';
      case 'outline':
        return 'bg-transparent border border-zinc-700';
      case 'danger':
        return 'bg-red-500/10 border border-red-500/50';
      default:
        return 'bg-[#cba6f7]'; // Tertiary Lavender
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'outline':
        return 'text-zinc-300';
      case 'danger':
        return 'text-red-400';
      case 'primary':
        return 'text-zinc-950'; // Dark text on light lavender
      default:
        return 'text-white';
    }
  };

  return (
    <Animated.View style={[animatedStyle, style as any]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`w-full py-4 px-6 flex items-center justify-center flex-row gap-3 ${getVariantStyles()} ${
          props.disabled || isLoading ? 'opacity-50' : ''
        } ${className}`}
        disabled={isLoading || props.disabled}
        style={{
          borderTopLeftRadius: 28,
          borderBottomRightRadius: 28,
          borderTopRightRadius: 6,
          borderBottomLeftRadius: 6,
        }}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator color={variant === 'outline' ? '#a1a1aa' : 'white'} />
        ) : (
          <Text className={`text-center font-bold text-lg tracking-wide ${getTextStyles()}`}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
