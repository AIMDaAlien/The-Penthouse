export const Colors = {
    // Catppuccin Mocha Foundation
    CRUST: '#11111b',
    MANTLE: '#181825',
    BASE: '#1e1e2e',
    SURFACE0: '#313244',
    SURFACE1: '#45475a',
    SURFACE2: '#585b70',
    OVERLAY0: '#6c7086',
    OVERLAY1: '#7f849c',
    OVERLAY2: '#9399b2',
    SUBTEXT0: '#a6adc8',
    SUBTEXT1: '#bac2de',
    TEXT: '#cdd6f4',

    // Accents (Lavender -> Periwinkle ONLY)
    LAVENDER: '#b4befe',
    PERIWINKLE: '#8b9bf6',
    MAUVE: '#cba6f7', // Use sparingly

    // Gradients
    GRADIENT_PRIMARY: ['#b4befe', '#8b9bf6'] as const,
    GRADIENT_OVERLAY: ['rgba(180, 190, 254, 0.4)', 'rgba(139, 155, 246, 0.1)'] as const,

    // Semantic Colors (Muted Pastels)
    SUCCESS: '#a6e3a1', // Soft Green
    WARNING: '#f9e2af', // Soft Amber
    ERROR: '#f38ba8',   // Soft Red
    INFO: '#89b4fa',    // Soft Blue

    // Status
    ONLINE: '#a6e3a1',
    AWAY: '#f9e2af',
    OFFLINE: '#6c7086',

    // Glass System (RGBA Strings for CSS/Style usage)
    GLASS: {
        PANEL_BG: 'rgba(18, 18, 28, 0.55)',
        PANEL_BORDER: 'rgba(255, 255, 255, 0.08)',
        
        CARD_BG: 'rgba(30, 30, 46, 0.65)',
        CARD_BORDER: 'rgba(255, 255, 255, 0.06)',
        
        ROW_BG: 'rgba(49, 50, 68, 0.4)',
        ROW_HOVER: 'rgba(69, 71, 90, 0.5)',
        ROW_BORDER: 'rgba(255, 255, 255, 0.04)',
        
        INPUT_BG: 'rgba(17, 17, 27, 0.6)',
        INPUT_BORDER: 'rgba(255, 255, 255, 0.08)',
        INPUT_FOCUS_BORDER: '#b4befe',
    }
} as const;
