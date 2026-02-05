import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '../../designsystem/Colors';
import { Typography } from '../../designsystem/Typography';
import { Spacing, Radius } from '../../designsystem/Spacing';
import { Shadows } from '../../designsystem/Shadows';
import { SpringConfig, Tokens } from '../../designsystem/Animations';

interface GlassButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'tertiary';
    icon?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    disabled?: boolean;
    loading?: boolean;
}


const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassButton({ 
    title, 
    onPress, 
    variant = 'primary', 
    icon, 
    style, 
    textStyle,
    disabled = false,
    loading = false
}: GlassButtonProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const handlePressIn = () => {
        if (disabled || loading) return;
        scale.value = withSpring(Tokens.TAP_SCALE, SpringConfig.MICRO);
        Haptics.selectionAsync();
    };

    const handlePressOut = () => {
        if (disabled || loading) return;
        scale.value = withSpring(1, SpringConfig.MICRO);
    };

    const Container = variant === 'primary' ? LinearGradient : Animated.View;
    const containerProps = variant === 'primary' 
        ? { colors: Colors.GRADIENT_PRIMARY, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }
        : {};

    const getVariantStyle = () => {
        switch (variant) {
            case 'secondary': return styles.secondary;
            case 'tertiary': return styles.tertiary;
            default: return styles.primary;
        }
    };

    const getTextStyle = () => {
        if (variant === 'tertiary') return { color: Colors.LAVENDER };
        if (variant === 'primary') return { color: Colors.CRUST }; // Dark text on light gradient
        return { color: Colors.TEXT };
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            style={[
                styles.base,
                getVariantStyle(),
                variant !== 'tertiary' && Shadows.BUTTON,
                style,
                animatedStyle,
                disabled && styles.disabled
            ]}
        >
            {variant === 'primary' ? (
                 <LinearGradient
                    colors={Colors.GRADIENT_PRIMARY}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
            ) : null}
            
            {icon}
            <Text style={[
                Typography.H2, 
                { fontSize: 16, fontWeight: '600' }, // Button text override
                getTextStyle(),
                icon ? { marginLeft: Spacing.S } : undefined,
                textStyle
            ]}>
                {loading ? '...' : title}
            </Text>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: Radius.BUTTON,
        overflow: 'hidden', // For gradient
    },
    primary: {
        // Gradient handled by LinearGradient child
    },
    secondary: {
        backgroundColor: Colors.GLASS.CARD_BG,
        borderColor: Colors.GLASS.CARD_BORDER,
        borderWidth: 1,
    },
    tertiary: {
        backgroundColor: 'transparent',
    },
    disabled: {
        opacity: 0.5,
    }
});
