import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors } from '../../designsystem/Colors';
import { Shadows } from '../../designsystem/Shadows';
import { Radius } from '../../designsystem/Spacing';

interface GlassPanelProps {
    children: React.ReactNode;
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
    blurIntensity?: number;
    noShadow?: boolean;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export function GlassPanel({ 
    children, 
    style, 
    contentContainerStyle,
    blurIntensity = 25, 
    noShadow = false 
}: GlassPanelProps) {
    // On Android, BlurView support varies, so we fall back to a semi-transparent view if needed
    // However, expo-blur works reasonably well on modern Android.
    
    return (
        <Animated.View 
            entering={FadeIn.springify().damping(20).stiffness(250)} 
            style={[
                styles.container, 
                !noShadow && Shadows.PANEL,
                style
            ]}
        >
            <BlurView 
                intensity={Platform.OS === 'ios' ? blurIntensity : 100} // Android needs higher intensity to show well
                tint="dark" 
                style={StyleSheet.absoluteFill}
            />
            {/* Tint Overlay for specific color match */}
            <View style={styles.tint} />
            
            <View style={[styles.content, contentContainerStyle]}>
                {children}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        borderRadius: Radius.PANEL,
        backgroundColor: 'transparent', // Let blur show through
        borderColor: Colors.GLASS.PANEL_BORDER,
        borderWidth: 1,
    },
    tint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.GLASS.PANEL_BG,
    },
    content: {
        flex: 1,
        // Ensure content sits above the tint
        zIndex: 1,
    }
});
