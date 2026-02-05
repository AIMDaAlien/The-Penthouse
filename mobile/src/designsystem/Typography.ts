import { TextStyle } from 'react-native';

export const Fonts = {
    UBUNTU: {
        LIGHT: 'Ubuntu_300Light',
        REGULAR: 'Ubuntu_400Regular',
        MEDIUM: 'Ubuntu_500Medium',
        BOLD: 'Ubuntu_700Bold',
    },
    JETBRAINS: {
        REGULAR: 'JetBrainsMono_400Regular',
        MEDIUM: 'JetBrainsMono_500Medium',
    }
} as const;

export const Typography = {
    DISPLAY: {
        fontFamily: Fonts.UBUNTU.BOLD,
        fontSize: 32,
        lineHeight: 36,
        letterSpacing: -0.8, // -0.02em approx
        color: '#cdd6f4',
    } as TextStyle,
    
    H1: {
        fontFamily: Fonts.UBUNTU.BOLD,
        fontSize: 24,
        lineHeight: 29, // 1.2
        color: '#cdd6f4',
    } as TextStyle,

    H2: {
        fontFamily: Fonts.UBUNTU.MEDIUM,
        fontSize: 20,
        lineHeight: 26, // 1.3
        color: '#cdd6f4',
    } as TextStyle,

    BODY: {
        fontFamily: Fonts.UBUNTU.REGULAR,
        fontSize: 16,
        lineHeight: 24, // 1.5
        color: '#bac2de', // Subtext1
    } as TextStyle,

    CAPTION: {
        fontFamily: Fonts.UBUNTU.REGULAR,
        fontSize: 13,
        lineHeight: 18, // 1.4
        color: '#a6adc8', // Subtext0
    } as TextStyle,

    MICRO: {
        fontFamily: Fonts.UBUNTU.MEDIUM,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.8, // 0.08em approx
        textTransform: 'uppercase',
        color: '#6c7086', // Overlay0
    } as TextStyle,

    // Settings / Code
    MONO: {
        fontFamily: Fonts.JETBRAINS.REGULAR,
        fontSize: 14,
        lineHeight: 20,
        color: '#bac2de',
    } as TextStyle,
} as const;
