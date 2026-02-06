/**
 * Muted Periwinkle Design System - Color Palette
 * 
 * A cohesive, premium color palette with blue-violet undertones throughout.
 * Designed for accessibility (WCAG AA compliant) and ClearVision-style effects.
 */

export const Colors = {
  // ─────────────────────────────────────────────────────────────
  // BACKGROUNDS (Darkest to Lightest)
  // ─────────────────────────────────────────────────────────────
  
  /** Server rail, darkest surfaces */
  TERTIARY: '#16161e',
  
  /** Sidebars, panels, secondary areas */
  SECONDARY: '#1c1c28',
  
  /** Main content area, chat background */
  PRIMARY: '#242432',
  
  /** Cards, inputs, elevated surfaces */
  SURFACE: '#2e2e40',
  
  /** Hover states, highlighted surfaces */
  SURFACE_HOVER: '#383850',

  // ─────────────────────────────────────────────────────────────
  // TEXT
  // ─────────────────────────────────────────────────────────────
  
  /** Primary text - high contrast */
  TEXT_NORMAL: '#d8d8e8',
  
  /** Secondary/muted text */
  TEXT_MUTED: '#8888a8',
  
  /** Links and interactive text */
  TEXT_LINK: '#9898c8',
  
  // ─────────────────────────────────────────────────────────────
  // ACCENT (Muted Periwinkle)
  // ─────────────────────────────────────────────────────────────
  
  /** Primary accent - buttons, selections, highlights */
  ACCENT: '#8888b8',
  
  /** Hover state for accent elements */
  ACCENT_HOVER: '#7070a0',
  
  /** Light variant - active/selected states */
  ACCENT_LIGHT: '#a0a0d0',

  // ─────────────────────────────────────────────────────────────
  // SEMANTIC COLORS (Muted variants)
  // ─────────────────────────────────────────────────────────────
  
  /** Success states, confirmations */
  SUCCESS: '#70a888',
  
  /** Warnings, cautions */
  WARNING: '#c8a868',
  
  /** Errors, destructive actions */
  ERROR: '#b87080',
  
  /** Informational messages */
  INFO: '#7898c0',

  // ─────────────────────────────────────────────────────────────
  // STATUS (User presence)
  // ─────────────────────────────────────────────────────────────
  
  ONLINE: '#70a888',
  IDLE: '#c8a868',
  /** @deprecated Use IDLE */
  AWAY: '#c8a868',
  DND: '#b87080',
  OFFLINE: '#606078',
  STREAMING: '#8070a8',

  // ─────────────────────────────────────────────────────────────
  // INTERACTIVE (Icons, controls)
  // ─────────────────────────────────────────────────────────────
  
  /** Default interactive elements */
  INTERACTIVE_NORMAL: '#9898b0',
  
  /** Hovered interactive elements */
  INTERACTIVE_HOVER: '#b0b0c8',
  
  /** Active/pressed interactive elements */
  INTERACTIVE_ACTIVE: '#e0e0f0',
  
  /** Disabled/muted interactive elements */
  INTERACTIVE_MUTED: '#505068',

  // ─────────────────────────────────────────────────────────────
  // CHANNELS (Sidebar channel states)
  // ─────────────────────────────────────────────────────────────
  
  CHANNEL_DEFAULT: '#9898b0',
  CHANNEL_MUTED: '#606078',
  CHANNEL_HOVER: '#b0b0c8',
  CHANNEL_SELECTED: '#e0e0f0',
  CHANNEL_UNREAD: '#9898c8',

  // ─────────────────────────────────────────────────────────────
  // EFFECTS (ClearVision-style premium elements)
  // ─────────────────────────────────────────────────────────────
  
  EFFECTS: {
    /** Glow color for accent elements (buttons, badges) */
    GLOW_ACCENT: 'rgba(136, 136, 184, 0.4)',
    
    /** Subtle glow for unread indicators */
    GLOW_UNREAD: 'rgba(152, 152, 200, 0.6)',
    
    /** Panel background with transparency (for backdrop-blur) */
    PANEL_BG: 'rgba(28, 28, 40, 0.85)',
    
    /** Panel border - subtle */
    PANEL_BORDER: 'rgba(255, 255, 255, 0.06)',
    
    /** Modal/popout background */
    MODAL_BG: 'rgba(36, 36, 50, 0.95)',
    
    /** Card background with transparency */
    CARD_BG: 'rgba(46, 46, 64, 0.8)',
    
    /** Input field background */
    INPUT_BG: 'rgba(22, 22, 30, 0.9)',
    
    /** Input border default */
    INPUT_BORDER: 'rgba(255, 255, 255, 0.08)',
    
    /** Input border when focused */
    INPUT_FOCUS_BORDER: '#8888b8',
  },

  // ─────────────────────────────────────────────────────────────
  // GRADIENTS
  // ─────────────────────────────────────────────────────────────
  
  GRADIENTS: {
    /** Header gradient divider (fades from center) */
    HEADER_LINE: ['transparent', '#8888b8', 'transparent'] as const,
    
    /** Accent gradient for special elements */
    ACCENT: ['#8888b8', '#7070a0'] as const,
    
    /** Overlay gradient for backgrounds */
    OVERLAY: ['rgba(136, 136, 184, 0.2)', 'rgba(112, 112, 160, 0.05)'] as const,
  },
  // ─────────────────────────────────────────────────────────────
  // LEGACY ALIASES (for backwards compatibility during migration)
  // TODO: Remove these once all components are migrated
  // ─────────────────────────────────────────────────────────────
  
  /** @deprecated Use TERTIARY */
  CRUST: '#16161e',
  /** @deprecated Use SECONDARY */
  MANTLE: '#1c1c28',
  /** @deprecated Use PRIMARY */
  BASE: '#242432',
  /** @deprecated Use SURFACE */
  SURFACE0: '#2e2e40',
  /** @deprecated Use SURFACE_HOVER */
  SURFACE1: '#383850',
  SURFACE2: '#484860',
  OVERLAY0: '#606078',
  OVERLAY1: '#7878a0',
  OVERLAY2: '#9898b0',
  SUBTEXT0: '#a8a8c0',
  SUBTEXT1: '#c0c0d8',
  /** @deprecated Use TEXT_NORMAL */
  TEXT: '#d8d8e8',
  
  /** @deprecated Use ACCENT */
  LAVENDER: '#8888b8',
  /** @deprecated Use ACCENT_LIGHT */
  PERIWINKLE: '#a0a0d0',
  MAUVE: '#9080b0',
  
  /** @deprecated Use GRADIENTS */
  GRADIENT_PRIMARY: ['#8888b8', '#7070a0'] as const,
  GRADIENT_OVERLAY: ['rgba(136, 136, 184, 0.2)', 'rgba(112, 112, 160, 0.05)'] as const,

  /** @deprecated Use EFFECTS */
  GLASS: {
    PANEL_BG: 'rgba(28, 28, 40, 0.85)',
    PANEL_BORDER: 'rgba(255, 255, 255, 0.06)',
    CARD_BG: 'rgba(46, 46, 64, 0.8)',
    CARD_BORDER: 'rgba(255, 255, 255, 0.06)',
    ROW_BG: 'rgba(46, 46, 64, 0.6)',
    ROW_HOVER: 'rgba(56, 56, 80, 0.7)',
    ROW_BORDER: 'rgba(255, 255, 255, 0.04)',
    INPUT_BG: 'rgba(22, 22, 30, 0.9)',
    INPUT_BORDER: 'rgba(255, 255, 255, 0.08)',
    INPUT_FOCUS_BORDER: '#8888b8',
  },
} as const;

// Type for accessing nested color values
export type ColorValue = typeof Colors;
