import React, { useState } from 'react';
import { TextInput, TextInputProps, View, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '../../designsystem/Colors';
import { Typography } from '../../designsystem/Typography';
import { Radius, Spacing } from '../../designsystem/Spacing';
import { Shadows } from '../../designsystem/Shadows';
import { SpringConfig } from '../../designsystem/Animations';

interface GlassInputProps extends TextInputProps {
    containerStyle?: StyleProp<ViewStyle>;
    style?: StyleProp<TextStyle>;
    icon?: React.ReactNode;
}

export const GlassInput = React.forwardRef<TextInput, GlassInputProps>(({ style, containerStyle, icon, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const focusProgress = useSharedValue(0);

    const animatedBorderStyle = useAnimatedStyle(() => ({
        borderColor: focusProgress.value === 1 
            ? Colors.GLASS.INPUT_FOCUS_BORDER 
            : Colors.GLASS.INPUT_BORDER,
        // Glow effect simulated with shadow
        shadowOpacity: focusProgress.value * 0.4,
        shadowRadius: focusProgress.value * 8,
        shadowColor: Colors.LAVENDER,
        shadowOffset: { width: 0, height: 0 },
    }));

    const handleFocus = (e: any) => {
        focusProgress.value = withSpring(1, SpringConfig.MICRO);
        setIsFocused(true);
        props.onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        focusProgress.value = withSpring(0, SpringConfig.MICRO);
        setIsFocused(false);
        props.onBlur?.(e);
    };

    return (
        <Animated.View style={[
            styles.container, 
            animatedBorderStyle,
            containerStyle
        ]}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <TextInput
                ref={ref}
                style={[
                    styles.input, 
                    Typography.BODY,
                    style
                ]}
                placeholderTextColor={Colors.OVERLAY1}
                onFocus={handleFocus}
                onBlur={handleBlur}
                {...props}
            />
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.GLASS.INPUT_BG,
        borderRadius: Radius.INPUT,
        borderWidth: 1,
        borderColor: Colors.GLASS.INPUT_BORDER,
        paddingHorizontal: Spacing.M,
        paddingVertical: Spacing.S,
        height: 50,
    },
    focusedContainer: {
        borderColor: Colors.GLASS.INPUT_FOCUS_BORDER,
        ...Shadows.GLOW,
    },
    iconContainer: {
        marginRight: Spacing.S,
    },
    input: {
        flex: 1,
        color: Colors.TEXT,
        height: '100%', // Ensure it fills height
    }
});
