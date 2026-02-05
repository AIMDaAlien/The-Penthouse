import { WithSpringConfig } from 'react-native-reanimated';

// Material 3 Expressive Springs - Custom Interpretation for React Native Reanimated
export const SpringConfig = {
    // Fast, responsive, high bounce (Micro-interactions, toggles)
    MICRO: {
        damping: 10,
        stiffness: 300,
        mass: 0.8,
    } as WithSpringConfig,

    // Standard UI movement (Cards, Lists)
    STANDARD: {
        damping: 20,
        stiffness: 250,
        mass: 1,
    } as WithSpringConfig,

    // Heavy panels sliding in
    PANEL: {
        damping: 30, // Higher damping for less oscillation on large moves
        stiffness: 200, // Lower stiffness for "weight"
        mass: 1.2,
    } as WithSpringConfig,

    // Bouncy playful moments
    BOUNCY: {
        damping: 12,
        stiffness: 200,
        mass: 1,
    } as WithSpringConfig,

    // Slow ambient drifts
    AMBIENT: {
        damping: 100,
        stiffness: 50,
        mass: 3,
    } as WithSpringConfig,
} as const;

export const Tokens = {
    STAGGER: 30, // ms
    TAP_SCALE: 0.97,
} as const;
