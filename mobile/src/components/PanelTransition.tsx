import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, { 
    useAnimatedStyle, 
    useSharedValue, 
    withSpring, 
    WithSpringConfig,
    interpolate
} from 'react-native-reanimated';
import { SpringConfig } from '../designsystem/Animations';

interface PanelTransitionProps {
    children: React.ReactNode;
    isVisible: boolean;
    direction?: 'left' | 'right' | 'up';
    style?: ViewStyle;
    zIndex?: number;
}

export function PanelTransition({ 
    children, 
    isVisible, 
    direction = 'right', 
    style,
    zIndex = 1
}: PanelTransitionProps) {
    const progress = useSharedValue(isVisible ? 1 : 0);

    useEffect(() => {
        progress.value = withSpring(isVisible ? 1 : 0, SpringConfig.PANEL);
    }, [isVisible]);

    const animatedStyle = useAnimatedStyle(() => {
        // 0 -> Off screen
        // 1 -> On screen (0 translation)
        
        let translateX = 0;
        let translateY = 0;
        const SCREEN_OFFSET = 500; // Sufficiently large

        if (direction === 'right') {
            // Slide in from right
            translateX = interpolate(progress.value, [0, 1], [SCREEN_OFFSET, 0]);
        } else if (direction === 'left') {
            // Slide in from left
            translateX = interpolate(progress.value, [0, 1], [-SCREEN_OFFSET, 0]);
        } else if (direction === 'up') {
            // Slide up from bottom
            translateY = interpolate(progress.value, [0, 1], [SCREEN_OFFSET, 0]);
        }

        const opacity = interpolate(progress.value, [0, 0.4, 1], [0, 1, 1]);
        const scale = interpolate(progress.value, [0, 1], [0.96, 1]);

        return {
            transform: [
                { translateX },
                { translateY },
                { scale }
            ],
            opacity,
            zIndex // Ensure z-index is respected for stacking
        };
    });

    // If not visible and animation done, we could unmount, but for now we keep it mounting 
    // to preserve state (like scroll position), just pointer events off.
    
    return (
        <Animated.View 
            style={[styles.container, style, animatedStyle]}
            pointerEvents={isVisible ? 'auto' : 'none'}
        >
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject, // Panels fill the screen area provided
    }
});
