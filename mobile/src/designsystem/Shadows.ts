import { ViewStyle } from 'react-native';

export const Shadows = {
    // Static shadows only - do not animate these properties
    PANEL: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.45,
        shadowRadius: 50,
        elevation: 24, // Android fallback
    } as ViewStyle,

    CARD: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 12,
    } as ViewStyle,

    BUTTON: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    } as ViewStyle,

    FAB: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 16,
    } as ViewStyle,

    GLOW: {
        shadowColor: '#b4befe', // Lavender glow
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 10,
    } as ViewStyle,
} as const;
