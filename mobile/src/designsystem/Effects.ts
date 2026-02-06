/**
 * Effects Design System
 * 
 * ClearVision-inspired visual effects for premium feel.
 * Includes shadows, glows, and blur configurations.
 */

import { ViewStyle } from 'react-native';
import { Colors } from './Colors';

// ─────────────────────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────────────────────

export const Shadows = {
  /** Subtle elevation for cards */
  CARD: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  /** Medium elevation for modals */
  MODAL: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,

  /** Strong elevation for popouts */
  POPOUT: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  } as ViewStyle,

  /** Input focus shadow */
  INPUT_FOCUS: {
    shadowColor: Colors.ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,

  /** No shadow */
  NONE: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  // Legacy aliases
  /** @deprecated Use CARD */
  BUTTON: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,

  /** @deprecated Use MODAL */
  PANEL: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  } as ViewStyle,

  /** @deprecated Use Glows.ACCENT */
  GLOW: {
    shadowColor: Colors.ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  } as ViewStyle,
} as const;

// ─────────────────────────────────────────────────────────────
// GLOWS (ClearVision-style)
// ─────────────────────────────────────────────────────────────

export const Glows = {
  /** Accent button glow */
  ACCENT: {
    shadowColor: Colors.ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  /** Unread indicator glow */
  UNREAD: {
    shadowColor: Colors.ACCENT_LIGHT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,

  /** Selected server glow */
  SELECTED: {
    shadowColor: Colors.ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  } as ViewStyle,

  /** Success state glow */
  SUCCESS: {
    shadowColor: Colors.SUCCESS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  /** Error state glow */
  ERROR: {
    shadowColor: Colors.ERROR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
} as const;

// ─────────────────────────────────────────────────────────────
// BLUR (for translucent panels)
// ─────────────────────────────────────────────────────────────

export const BlurConfig = {
  /** Light blur for overlays */
  LIGHT: {
    intensity: 20,
    tint: 'dark' as const,
  },

  /** Standard blur for panels */
  STANDARD: {
    intensity: 40,
    tint: 'dark' as const,
  },

  /** Heavy blur for modals */
  HEAVY: {
    intensity: 60,
    tint: 'dark' as const,
  },
} as const;

// ─────────────────────────────────────────────────────────────
// TRANSITIONS (durations in ms)
// ─────────────────────────────────────────────────────────────

export const Transitions = {
  /** Fast - hover states, small changes */
  FAST: 100,

  /** Normal - standard interactions */
  NORMAL: 200,

  /** Slow - page transitions, large changes */
  SLOW: 300,

  /** Modal enter/exit */
  MODAL: 250,
} as const;
