import React from 'react';
import { View, ViewStyle, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../designsystem/Colors';
import { Shadows } from '../../designsystem/Shadows';
import { Radius, Spacing } from '../../designsystem/Spacing';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
    activeOpacity?: number;
}

export function GlassCard({ children, style, onPress, activeOpacity = 0.8 }: GlassCardProps) {
    const Container = onPress ? Pressable : View;

    return (
        <Container 
            style={({ pressed }: { pressed: boolean }) => [
                styles.container,
                Shadows.CARD,
                style,
                pressed && onPress && { opacity: activeOpacity, transform: [{ scale: 0.98 }] }
            ]}
            onPress={onPress}
        >
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.tint} />
            <View style={styles.content}>
                {children}
            </View>
        </Container>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: Radius.CARD,
        borderColor: Colors.GLASS.CARD_BORDER,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    tint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.GLASS.CARD_BG,
    },
    content: {
        padding: Spacing.M,
        zIndex: 1,
    }
});
